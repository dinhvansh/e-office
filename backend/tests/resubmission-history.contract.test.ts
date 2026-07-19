import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

// Tests compile into .test-dist/tests; source remains at the backend root.
const backendRoot = path.resolve(__dirname, "..", "..");
const read = (relativePath: string) => fs.readFileSync(path.join(backendRoot, relativePath), "utf8");

test("resubmit preserves run 1 approval/runtime history and creates a numbered run 2", () => {
  const resubmission = read("src/modules/signRequests/signRequests.service.ts");
  const repository = read("src/modules/approvals/approvals.repository.ts");
  const approvalsService = read("src/modules/approvals/approvals.service.ts");
  const schema = read("prisma/schema.prisma");

  const prepareResubmission = resubmission.slice(
    resubmission.indexOf("private async prepareResubmission"),
    resubmission.indexOf("private async validateSignFieldsIfNeeded"),
  );

  // submit -> partial approval -> cancel/reject -> resubmit must leave the old
  // rows intact; the approval service creates the next monotonically numbered run.
  assert.doesNotMatch(prepareResubmission, /document_approvals\.deleteMany/);
  assert.doesNotMatch(prepareResubmission, /workflow_instances\.deleteMany/);
  assert.match(prepareResubmission, /workflow_instances\.updateMany/);
  assert.match(repository, /run_number: \(latest\?\.run_number \|\| 0\) \+ 1/);
  assert.match(approvalsService, /workflow_instance_id: createdInstance\.id/);
  assert.match(schema, /workflow_instance_id\s+Int/);
  assert.match(schema, /@@unique\(\[document_id, run_number\]\)/);
});
