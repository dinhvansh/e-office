import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { prisma } from "../src/config/prisma";
import { completionCertificateService } from "../src/modules/documents/completionCertificate.service";

const regularFont = [
  process.env.PDF_UNICODE_FONT_PATH,
  "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
  "C:/Windows/Fonts/arial.ttf",
].find((value) => value && fs.existsSync(value));
const boldFont = [
  process.env.PDF_UNICODE_BOLD_FONT_PATH,
  "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
  "C:/Windows/Fonts/arialbd.ttf",
].find((value) => value && fs.existsSync(value));

async function onePagePdf() {
  const pdf = await PDFDocument.create();
  pdf.addPage([300, 300]);
  return pdf.save();
}

test("completed approval-only delivery appends one completion certificate page", async () => {
  assert.ok(regularFont && boldFont, "Unicode PDF fonts are required");
  const previousRegular = process.env.PDF_UNICODE_FONT_PATH;
  const previousBold = process.env.PDF_UNICODE_BOLD_FONT_PATH;
  const originalFindFirst = prisma.documents.findFirst;
  process.env.PDF_UNICODE_FONT_PATH = regularFont;
  process.env.PDF_UNICODE_BOLD_FONT_PATH = boldFont;
  (prisma.documents.findFirst as unknown as { (...args: unknown[]): Promise<unknown> }) = async () => ({
    id: 41,
    status: "completed",
    title: "Approval only document",
    original_file_name: "approval.pdf",
    document_number: "DOC-41",
    owner: { full_name: "Document Owner", email: "owner@example.test" },
    sign_request: { signers: [] },
    workflow_instances: [{
      status: "completed",
      run_number: 2,
      completed_at: new Date("2026-07-20T08:00:00.000Z"),
      workflow: { name: "Approval workflow" },
      approvals: [
        { id: 1, action: "approved", acted_at: new Date("2026-07-20T07:00:00.000Z"), comment: "OK", approver: { full_name: "Approver A", email: "a@example.test" }, workflow_step: { step_order: 1, step_name: "Review" } },
        { id: 2, action: "approved", acted_at: new Date("2026-07-20T08:00:00.000Z"), comment: null, approver: { full_name: "Approver B", email: "b@example.test" }, workflow_step: { step_order: 2, step_name: "Final approval" } },
      ],
    }],
  }) as never;

  try {
    const result = await completionCertificateService.appendApprovalCertificate({ documentId: 41, tenantId: 3, fileBytes: await onePagePdf() });
    assert.equal(result.applied, true);
    assert.equal((await PDFDocument.load(result.fileBytes)).getPageCount(), 2);
  } finally {
    prisma.documents.findFirst = originalFindFirst;
    process.env.PDF_UNICODE_FONT_PATH = previousRegular;
    process.env.PDF_UNICODE_BOLD_FONT_PATH = previousBold;
  }
});

test("signing-only documents receive a completion certificate with signing history", async () => {
  assert.ok(regularFont && boldFont, "Unicode PDF fonts are required");
  const previousRegular = process.env.PDF_UNICODE_FONT_PATH;
  const previousBold = process.env.PDF_UNICODE_BOLD_FONT_PATH;
  const originalFindFirst = prisma.documents.findFirst;
  process.env.PDF_UNICODE_FONT_PATH = regularFont;
  process.env.PDF_UNICODE_BOLD_FONT_PATH = boldFont;
  (prisma.documents.findFirst as unknown as { (...args: unknown[]): Promise<unknown> }) = async () => ({
    id: 42,
    title: "Signing only document",
    original_file_name: "signing.pdf",
    document_number: "DOC-42",
    owner: { full_name: "Document Owner", email: "owner@example.test" },
    sign_request: { signers: [{ id: 7, name: "External Signer", email: "external@example.test", status: "signed", signed_at: new Date("2026-07-20T08:00:00.000Z"), ip_address: "127.0.0.1" }] },
    workflow_instances: [],
  }) as never;
  try {
    const input = await onePagePdf();
    const result = await completionCertificateService.appendApprovalCertificate({ documentId: 42, tenantId: 3, fileBytes: input });
    assert.equal(result.applied, true);
    assert.equal((await PDFDocument.load(result.fileBytes)).getPageCount(), 2);
  } finally {
    prisma.documents.findFirst = originalFindFirst;
    process.env.PDF_UNICODE_FONT_PATH = previousRegular;
    process.env.PDF_UNICODE_BOLD_FONT_PATH = previousBold;
  }
});
