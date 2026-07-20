import { PDFDocument, PDFFont, PDFPage, rgb } from "pdf-lib";
import { prisma } from "../../config/prisma";
import { embedUnicodeFont } from "../../core/pdf/unicodeFont";

type CertificateApproval = {
  id: number;
  action: string | null;
  acted_at: Date | null;
  comment: string | null;
  approver: { full_name: string | null; email: string };
  workflow_step: { step_order: number; step_name: string | null };
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const ROWS_PER_PAGE = 24;

function outcomeLabel(action: string | null) {
  if (action === "approved") return "APPROVED";
  if (action === "rejected") return "REJECTED";
  if (action === "cancelled") return "CANCELLED";
  return "PENDING";
}

function safeText(value: string | null | undefined, maxLength: number) {
  const normalized = String(value || "-").replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, Math.max(0, maxLength - 3))}...` : normalized;
}

function drawText(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size = 8) {
  page.drawText(text, { x, y, size, font, color: rgb(0.15, 0.18, 0.22) });
}

class CompletionCertificateService {
  async appendApprovalCertificate(input: { documentId: number; tenantId: number; fileBytes: Uint8Array }) {
    const document = await prisma.documents.findFirst({
      where: { id: input.documentId, tenant_id: input.tenantId },
      include: {
        owner: { select: { full_name: true, email: true } },
        sign_request: { select: { signers: { select: { id: true }, take: 1 } } },
        workflow_instances: {
          orderBy: { run_number: "desc" },
          take: 1,
          include: {
            workflow: { select: { name: true } },
            approvals: {
              orderBy: { created_at: "asc" },
              include: {
                approver: { select: { full_name: true, email: true } },
                workflow_step: { select: { step_order: true, step_name: true } },
              },
            },
          },
        },
      },
    });

    const run = document?.workflow_instances[0];
    const approvalOnly = (document?.sign_request?.signers.length || 0) === 0;
    if (!document || document.status !== "completed" || !approvalOnly || run?.status !== "completed" || !run.approvals.length) {
      return { fileBytes: Buffer.from(input.fileBytes), applied: false };
    }

    const pdf = await PDFDocument.load(input.fileBytes);
    const font = await embedUnicodeFont(pdf, false);
    const boldFont = await embedUnicodeFont(pdf, true);
    const originalPageCount = pdf.getPageCount();
    const chunks: CertificateApproval[][] = [];
    for (let index = 0; index < run.approvals.length; index += ROWS_PER_PAGE) {
      chunks.push(run.approvals.slice(index, index + ROWS_PER_PAGE));
    }

    chunks.forEach((approvals, pageIndex) => {
      const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 96, width: PAGE_WIDTH, height: 96, color: rgb(0.04, 0.24, 0.48) });
      page.drawText("CERTIFICATE OF COMPLETION", { x: 42, y: PAGE_HEIGHT - 52, size: 20, font: boldFont, color: rgb(1, 1, 1) });
      page.drawText(pageIndex === 0 ? "Approval workflow completion record" : `Approval history - continued ${pageIndex + 1}/${chunks.length}`, { x: 42, y: PAGE_HEIGHT - 74, size: 9, font, color: rgb(0.85, 0.92, 1) });

      let y = PAGE_HEIGHT - 128;
      if (pageIndex === 0) {
        drawText(page, "Document", 42, y, boldFont, 8);
        drawText(page, safeText(document.title || document.original_file_name, 72), 125, y, font, 8);
        y -= 18;
        drawText(page, "Document no.", 42, y, boldFont, 8);
        drawText(page, safeText(document.document_number, 40), 125, y, font, 8);
        drawText(page, "Original pages", 330, y, boldFont, 8);
        drawText(page, String(originalPageCount), 425, y, font, 8);
        y -= 18;
        drawText(page, "Workflow", 42, y, boldFont, 8);
        drawText(page, safeText(run.workflow.name, 52), 125, y, font, 8);
        drawText(page, "Run", 330, y, boldFont, 8);
        drawText(page, String(run.run_number), 425, y, font, 8);
        y -= 18;
        drawText(page, "Owner", 42, y, boldFont, 8);
        drawText(page, safeText(document.owner?.full_name || document.owner?.email, 52), 125, y, font, 8);
        drawText(page, "Completed", 330, y, boldFont, 8);
        drawText(page, run.completed_at ? run.completed_at.toISOString() : "-", 425, y, font, 7);
        y -= 30;
      }

      page.drawRectangle({ x: 36, y: y - 18, width: PAGE_WIDTH - 72, height: 22, color: rgb(0.9, 0.94, 0.98) });
      drawText(page, "Step", 42, y - 10, boldFont, 7);
      drawText(page, "Approver", 82, y - 10, boldFont, 7);
      drawText(page, "Outcome", 300, y - 10, boldFont, 7);
      drawText(page, "Timestamp", 375, y - 10, boldFont, 7);
      y -= 28;

      approvals.forEach((approval) => {
        drawText(page, String(approval.workflow_step.step_order), 42, y, font, 7);
        drawText(page, safeText(approval.approver.full_name || approval.approver.email, 34), 82, y, font, 7);
        drawText(page, outcomeLabel(approval.action), 300, y, boldFont, 7);
        drawText(page, approval.acted_at ? approval.acted_at.toISOString() : "-", 375, y, font, 6.5);
        y -= 12;
        drawText(page, safeText(approval.workflow_step.step_name, 45), 82, y, font, 6.5);
        if (approval.comment) drawText(page, safeText(approval.comment, 48), 300, y, font, 6.5);
        y -= 17;
        page.drawLine({ start: { x: 42, y: y + 8 }, end: { x: PAGE_WIDTH - 42, y: y + 8 }, thickness: 0.3, color: rgb(0.82, 0.84, 0.87) });
      });

      page.drawLine({ start: { x: 42, y: 58 }, end: { x: PAGE_WIDTH - 42, y: 58 }, thickness: 0.5, color: rgb(0.55, 0.6, 0.66) });
      drawText(page, `Document ID ${document.id} | Workflow run ${run.run_number} | Certificate page ${pageIndex + 1}/${chunks.length}`, 42, 42, font, 6.5);
    });

    return { fileBytes: Buffer.from(await pdf.save()), applied: true };
  }
}

export const completionCertificateService = new CompletionCertificateService();
