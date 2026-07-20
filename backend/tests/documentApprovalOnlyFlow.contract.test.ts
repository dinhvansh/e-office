import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(__dirname, "..", "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("completed approval-only flow falls back to latest run and counts approvals", () => {
  const flow = read("src/modules/documentFlow/documentFlow.service.ts");
  assert.match(flow, /find\(\s*\(instance\) => instance\.status === 'in_progress'/);
  assert.match(flow, /\|\| loadedDocument\.workflow_instances\[0\] \|\| null/);
  assert.match(flow, /approvals\.filter\(\(approval\) => approval\.action === 'approved'\)\.length/);
  assert.match(flow, /kind: hasSigningSteps \? 'signing' : 'approval'/);
  assert.match(flow, /workflow_runs: loadedDocument\.workflow_instances\.map/);
});

test("approval-only download and dossier preserve the actual artifact and run history", () => {
  const download = read("../frontend/components/documents/document-download-menu.tsx");
  const documents = read("src/modules/documents/documents.service.ts");
  assert.match(download, /hasSignedArtifact \? 'download-signed' : 'download'/);
  assert.doesNotMatch(download, /completed \|\| signedFilePath/);
  assert.match(documents, /signed_artifact_available: hasSignedArtifact/);
  assert.match(documents, /const deliveredPrimary = await this\.prepareDocumentDelivery\(primary\)/);
  assert.match(documents, /completion_certificate_applied: deliveredPrimary\.certificateApplied/);
  assert.match(documents, /delivery_watermark_applied: deliveredPrimary\.watermarkApplied/);
  assert.match(documents, /workflow_history: workflowHistory/);
  assert.match(documents, /run_number: run\.run_number/);
  assert.match(documents, /outcome: approval\.action/);
});

test("approval-only completion delivery appends a certificate before watermarking", () => {
  const documents = read("src/modules/documents/documents.service.ts");
  const certificate = read("src/modules/documents/completionCertificate.service.ts");
  assert.match(documents, /completionCertificateService\.appendApprovalCertificate/);
  assert.match(documents, /fileBytes = certificate\.fileBytes/);
  assert.match(documents, /getWatermarkedBufferIfNeeded\(\{ \.\.\.input, fileBytes \}\)/);
  assert.match(certificate, /CERTIFICATE OF COMPLETION/);
  assert.match(certificate, /run\?\.status !== "completed"/);
  assert.match(certificate, /approvalOnly/);
});

test("notification producers contain valid Vietnamese and migration repairs existing rows", () => {
  const approvals = read("src/modules/approvals/approvals.service.ts");
  const signRequests = read("src/modules/signRequests/signRequests.service.ts");
  const migration = read("prisma/migrations/20260720090000_repair_notification_utf8/migration.sql");
  const mojibake = /Ã|Â|Ä|Æ/;
  assert.doesNotMatch(approvals, mojibake);
  assert.doesNotMatch(signRequests, mojibake);
  assert.match(approvals, /Yêu cầu phê duyệt mới/);
  assert.match(signRequests, /Tài liệu bị từ chối ký/);
  assert.match(migration, /UPDATE notifications/);
  assert.match(migration, /convert_from\(convert_to\(title, 'WIN1252'\), 'UTF8'\)/);
  assert.match(migration, /LIKE '59c383%'/);
});
