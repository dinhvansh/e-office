const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const templatePath = path.join(root, ".env.test.example");
const projectName = "eoffice-e2e";
let temporaryDirectory;
let envFile;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  return (result.stdout || "").trim();
}

function compose(...args) {
  const options = typeof args.at(-1) === "object" ? args.pop() : {};
  return run("docker", ["compose", "--project-name", projectName, "--env-file", envFile, "-f", "docker-compose.yml", "-f", "docker-compose.test.yml", ...args], options);
}

function parseEnv(contents) {
  return Object.fromEntries(contents.split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    }));
}

async function waitForContainerHealth(service, timeoutMs = 120_000) {
  const containerId = compose("ps", "-q", service, { capture: true });
  if (!containerId) throw new Error(`Compose did not create ${service}`);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = run("docker", ["inspect", "--format", "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}", containerId], { capture: true });
    if (status === "healthy" || (service === "outbox-worker" && status === "running")) return;
    if (status === "unhealthy" || status === "exited") throw new Error(`${service} became ${status}`);
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`${service} did not become ready within ${timeoutMs / 1000}s`);
}

async function waitForBackend(timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch("http://localhost:4010/health");
      if (response.ok) return;
    } catch {
      // Docker health/readiness is still converging.
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error("backend /health did not become ready within 120s");
}

async function main() {
  if (!fs.existsSync(templatePath)) throw new Error(".env.test.example is missing");
  run("docker", ["version"]);

  const contents = fs.readFileSync(templatePath, "utf8");
  const values = parseEnv(contents);
  for (const key of ["POSTGRES_PASSWORD", "DATABASE_URL", "JWT_SECRET", "REFRESH_TOKEN_SECRET", "DEMO_ADMIN_PASSWORD", "E2E_ADMIN_PASSWORD"]) {
    if (!values[key]) throw new Error(`Missing ${key} in .env.test.example`);
  }

  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "eoffice-docker-e2e-"));
  envFile = path.join(temporaryDirectory, ".env.test");
  fs.writeFileSync(envFile, contents, { mode: 0o600 });

  try {
    compose("up", "--build", "--detach", "db", "redis", "backend", "outbox-worker");
    await waitForContainerHealth("db");
    await waitForContainerHealth("redis");
    await waitForContainerHealth("backend");
    await waitForContainerHealth("outbox-worker");
    await waitForBackend();

    compose("exec", "-T", "backend", "npx", "prisma", "migrate", "deploy");
    compose("exec", "-T",
      "-e", `E2E_ADMIN_PASSWORD=${values.E2E_ADMIN_PASSWORD}`,
      "-e", "E2E_API_BASE=http://backend:4000/api/v1",
      "-e", "E2E_PUBLIC_BASE=http://backend:4000/public",
      "backend", "npm", "run", "test:e2e:workflow");
  } finally {
    if (process.env.E2E_KEEP_CONTAINERS !== "1" && envFile) {
      try { compose("down", "--volumes", "--remove-orphans"); } catch (error) { console.error(error.message); }
    }
    if (temporaryDirectory) fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`[docker-e2e] ${error.message}`);
  process.exitCode = 1;
});
