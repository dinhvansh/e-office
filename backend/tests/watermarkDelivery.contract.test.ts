import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const backendRoot = path.resolve(__dirname, "..", "..");
const read = (relativePath: string) => fs.readFileSync(path.join(backendRoot, relativePath), "utf8");

test("artifact worker finalizes watermark and certificate before storage and hashing", () => {
  const worker = read("src/modules/signRequests/signedArtifact.worker.ts");
  assert.match(worker, /getWatermarkedBufferIfNeeded/);
  assert.match(worker, /appendApprovalCertificate/);
  assert.match(worker, /storageService\.put\(\{ key: signedFilePath, body: artifactBytes/);
  assert.match(worker, /createHash\("sha256"\)\.update\(artifactBytes\)/);
});

test("completion certificate keeps signing history aligned and includes signer IP evidence", () => {
  const certificate = read("src/modules/documents/completionCertificate.service.ts");

  assert.match(certificate, /SIGNING HISTORY/);
  assert.match(certificate, /IP address/);
  assert.match(certificate, /signer\.ip_address \|\| "Not recorded"/);
  assert.match(certificate, /tenant: \{ select: \{ name: true, logo_url: true \} \}/);
  assert.match(certificate, /loadTenantLogo/);
});

test("every primary document delivery channel streams persisted bytes without mutation", () => {
  const documentsController = read("src/modules/documents/documents.controller.ts");
  const approvalsController = read("src/modules/approvals/approvals.controller.ts");
  const publicController = read("src/modules/public/publicSign.controller.ts");
  const documentsService = read("src/modules/documents/documents.service.ts");

  assert.doesNotMatch(documentsController, /prepareDocumentDelivery|getWatermarkedDocumentBufferIfNeeded|appendApprovalCertificate/);
  assert.doesNotMatch(approvalsController, /prepareDocumentDelivery|getWatermarkedDocumentBufferIfNeeded|appendApprovalCertificate/);
  assert.doesNotMatch(publicController, /prepareDocumentDelivery|getWatermarkedDocumentBufferIfNeeded|appendApprovalCertificate/);
  assert.doesNotMatch(documentsService, /prepareDocumentDelivery|getWatermarkedDocumentBufferIfNeeded|appendApprovalCertificate/);
  assert.match(documentsService, /getDocumentDeliveryFile/);
  assert.match(documentsService, /FINAL_ARTIFACT_NOT_READY/);
});

test("completed approval-only documents fall back to their original PDF when no signed artifact exists", () => {
  const documentsService = read("src/modules/documents/documents.service.ts");

  assert.match(
    documentsService,
    /if \(!document\.signed_file_path \|\| !document\.hash\) \{\s*\/\/ A workflow may complete[\s\S]*?return documentFileService\.getOriginalFile\(document\);/,
  );
});

test("progressive signing previews cannot become a completed certificate artifact", () => {
  const signers = read("src/modules/signers/signers.service.ts");
  const progressivePdf = read("src/modules/signRequests/pdfGeneration.service.ts");
  const documentsService = read("src/modules/documents/documents.service.ts");

  assert.match(signers, /if \(!allSigned\) \{/);
  assert.doesNotMatch(progressivePdf, /includeAuditTrail/);
  assert.match(progressivePdf, /A progressive PDF never includes a completion certificate/);
  assert.match(documentsService, /metadata\?\.certificate_applied !== true/);
});
