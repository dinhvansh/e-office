import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Docker build context retains the authorization-matrix E2E script", () => {
  const backendRoot = path.resolve(__dirname, "../..");
  const ignore = fs.readFileSync(path.join(backendRoot, ".dockerignore"), "utf8");
  const script = path.join(backendRoot, "scripts", "test-authorization-matrix.js");

  assert.equal(fs.existsSync(script), true);
  assert.match(ignore, /^!scripts\/test-authorization-matrix\.js$/m);
});

test("authorization-matrix script preserves Docker database host unless local mode is explicit", () => {
  const backendRoot = path.resolve(__dirname, "../..");
  const source = fs.readFileSync(path.join(backendRoot, "scripts", "test-authorization-matrix.js"), "utf8");

  assert.match(source, /process\.env\.E2E_USE_LOCAL_DB === "1"/);
});

test("fresh RBAC seed grants the documented document-type permissions", () => {
  const backendRoot = path.resolve(__dirname, "../..");
  const source = fs.readFileSync(path.join(backendRoot, "scripts", "seed-rbac.js"), "utf8");

  for (const action of ["create", "read", "update", "delete"]) {
    assert.match(source, new RegExp(`resource: 'document_types', action: '${action}'`));
  }
});

test("multi-approval E2E waits for asynchronous artifact completion", () => {
  const backendRoot = path.resolve(__dirname, "../..");
  const source = fs.readFileSync(path.join(backendRoot, "scripts", "e2e-workflow-assignee.js"), "utf8");

  assert.match(source, /async function waitForCompletedSignRequest/);
  assert.match(source, /await waitForCompletedSignRequest\(signRequestId, headers\)/);
});

test("clean Docker UAT frontend is built against the exposed E2E backend", () => {
  const repoRoot = path.resolve(__dirname, "../../..");
  const env = fs.readFileSync(path.join(repoRoot, ".env.test.example"), "utf8");

  assert.match(env, /^BACKEND_PORT=4010$/m);
  assert.match(env, /^FRONTEND_PORT=3010$/m);
  assert.match(env, /^CORS_ORIGIN=http:\/\/127\.0\.0\.1:3010,http:\/\/localhost:3010$/m);
  assert.match(env, /^NEXT_PUBLIC_API_URL=http:\/\/127\.0\.0\.1:4010\/api\/v1$/m);
  assert.match(env, /^NEXT_PUBLIC_API_BASE_URL=http:\/\/127\.0\.0\.1:4010\/api\/v1$/m);
  assert.match(env, /^RATE_LIMIT_BYPASS_EMAILS=admin@acme\.local,manager@acme\.local,staff\.it@acme\.local,legal@acme\.local,finance@acme\.local$/m);
});
