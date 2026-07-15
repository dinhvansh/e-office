const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const storageMode = process.argv.includes("--storage=s3") ? "s3" : "local";
const templatePath = path.join(root, storageMode === "s3" ? ".env.s3.test.example" : ".env.test.example");
const projectName = storageMode === "s3" ? "eoffice-e2e-s3" : "eoffice-e2e";
const composeFiles = ["docker-compose.yml", "docker-compose.test.yml"];
if (storageMode === "s3") composeFiles.push("docker-compose.s3.test.yml");
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
  const fileArgs = composeFiles.flatMap((file) => ["-f", file]);
  return run("docker", ["compose", "--project-name", projectName, "--env-file", envFile, ...fileArgs, ...args], options);
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
  const port = process.env.E2E_BACKEND_PORT || "4010";
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://localhost:${port}/health`);
      if (response.ok) return;
    } catch {
      // Docker health/readiness is still converging.
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error("backend /health did not become ready within 120s");
}

async function waitForCompletedService(service, timeoutMs = 120_000) {
  // One-shot services are normally already exited by the time this is called.
  // `compose ps -q` only returns running containers unless `--all` is supplied.
  const containerId = compose("ps", "-q", "--all", service, { capture: true });
  if (!containerId) throw new Error(`Compose did not create ${service}`);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = run("docker", ["inspect", "--format", "{{.State.Status}}:{{.State.ExitCode}}", containerId], { capture: true });
    if (status === "exited:0") return;
    if (status.startsWith("exited:")) throw new Error(`${service} failed with ${status}`);
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`${service} did not complete within ${timeoutMs / 1000}s`);
}

async function main() {
  if (!fs.existsSync(templatePath)) throw new Error(`${path.basename(templatePath)} is missing`);
  run("docker", ["version"]);

  const contents = fs.readFileSync(templatePath, "utf8");
  const values = parseEnv(contents);
  for (const key of ["POSTGRES_PASSWORD", "DATABASE_URL", "JWT_SECRET", "REFRESH_TOKEN_SECRET", "DEMO_ADMIN_PASSWORD", "E2E_ADMIN_PASSWORD"]) {
    if (!values[key]) throw new Error(`Missing ${key} in .env.test.example`);
  }
  if (storageMode === "s3") {
    for (const key of ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "MINIO_ROOT_USER", "MINIO_ROOT_PASSWORD"]) {
      if (!values[key]) throw new Error(`Missing ${key} in .env.s3.test.example`);
    }
  }

  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "eoffice-docker-e2e-"));
  envFile = path.join(temporaryDirectory, ".env.test");
  fs.writeFileSync(envFile, contents, { mode: 0o600 });

  let succeeded = false;
  try {
    const services = storageMode === "s3"
      ? ["db", "redis", "minio", "minio-init", "backend", "outbox-worker"]
      : ["db", "redis", "backend", "outbox-worker"];
    compose("up", "--build", "--detach", ...services);
    await waitForContainerHealth("db");
    await waitForContainerHealth("redis");
    if (storageMode === "s3") {
      await waitForContainerHealth("minio");
      await waitForCompletedService("minio-init");
    }
    await waitForContainerHealth("backend");
    await waitForContainerHealth("outbox-worker");
    await waitForBackend();

    compose("exec", "-T", "backend", "npx", "prisma", "migrate", "deploy");
    compose("exec", "-T",
      "-e", `E2E_ADMIN_PASSWORD=${values.E2E_ADMIN_PASSWORD}`,
      "-e", "E2E_API_BASE=http://backend:4000/api/v1",
      "-e", "E2E_PUBLIC_BASE=http://backend:4000/public",
      "-e", `E2E_STORAGE_MODE=${storageMode}`,
      "backend", "npm", "run", "test:e2e:workflow");
    succeeded = true;
  } finally {
    if (!succeeded && envFile) {
      try {
        console.error("[docker-e2e] Service logs before cleanup:");
        compose("logs", "--no-color", "--tail", "250");
      } catch (error) { console.error(error.message); }
    }
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
