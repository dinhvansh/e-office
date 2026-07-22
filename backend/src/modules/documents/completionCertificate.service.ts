import { promises as fs } from "node:fs";
import path from "node:path";
import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb } from "pdf-lib";
import { prisma } from "../../config/prisma";
import { embedUnicodeFont } from "../../core/pdf/unicodeFont";
import { readStoredFile } from "../../core/storage/fileStorage";
import { storageService } from "../../core/storage/storage.service";

type CertificateApproval = {
  id: number;
  action: string | null;
  acted_at: Date | null;
  comment: string | null;
  approver: { full_name: string | null; email: string };
  workflow_step: { step_order: number; step_name: string | null };
};

type CertificateSigner = {
  id: number;
  name: string | null;
  email: string | null;
  status: string | null;
  signed_at: Date | null;
  ip_address: string | null;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const APPROVAL_ROWS_PER_PAGE = 14;
const SIGNER_ROWS_PER_PAGE = 20;
const BRAND_MARK_SIZE = 42;
const BRAND_TEXT_GAP = 16.5; // 22 CSS pixels at 96 DPI
const HEADER_HEIGHT = 128; // approximately 170 CSS pixels at 96 DPI
const HEADER_BOTTOM = PAGE_HEIGHT - HEADER_HEIGHT;
const HEADER_CENTER_Y = HEADER_BOTTOM + HEADER_HEIGHT / 2;

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

function formatTimestamp(value: Date | null | undefined) {
  return value ? value.toISOString().replace("T", " ").replace(".000Z", " UTC").replace("Z", " UTC") : "-";
}

function drawText(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size = 8, color = rgb(0.15, 0.18, 0.22)) {
  page.drawText(text, { x, y, size, font, color });
}

function chunks<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [];
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, index * size + size));
}

async function loadTenantLogo(pdf: PDFDocument, logoUrl: string | null | undefined): Promise<PDFImage | undefined> {
  // A tenant logo is a private storage object. Never fetch arbitrary remote URLs
  // while producing an artifact inside the worker.
  if (!logoUrl || /^https?:\/\//i.test(logoUrl)) return undefined;
  try {
    const bytes = await readStoredFile(storageService, logoUrl);
    const isPng = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    return isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  } catch {
    return undefined;
  }
}

async function loadProductLogo(pdf: PDFDocument): Promise<PDFImage | undefined> {
  // The fallback is the real product logo shipped with the backend image, not
  // a label or a network-fetched frontend asset.
  try {
    const bytes = await fs.readFile(path.resolve(process.cwd(), "assets", "flowdocker-logo.png"));
    return await pdf.embedPng(bytes);
  } catch {
    return undefined;
  }
}

function drawFlowDockerFallbackMark(page: PDFPage, x: number, y: number) {
  // Product fallback for tenants that have not uploaded their own logo. Keep it
  // vector-based so certificates do not depend on a frontend/static asset.
  const blue = rgb(0.08, 0.39, 0.92);
  const white = rgb(1, 1, 1);
  page.drawRectangle({ x, y, width: 34, height: 34, color: blue });

  // Simplified FlowDocker/E-Office pen-link mark. It intentionally contains
  // no placeholder text: the old "FD" monogram was not a brand logo.
  page.drawLine({ start: { x: x + 10, y: y + 9 }, end: { x: x + 24, y: y + 23 }, thickness: 4.2, color: white });
  page.drawLine({ start: { x: x + 13, y: y + 7 }, end: { x: x + 8, y: y + 12 }, thickness: 3.2, color: white });
  page.drawLine({ start: { x: x + 22, y: y + 27 }, end: { x: x + 27, y: y + 22 }, thickness: 3.2, color: white });
  page.drawLine({ start: { x: x + 8, y: y + 19 }, end: { x: x + 11, y: y + 22 }, thickness: 2.4, color: white });
  page.drawLine({ start: { x: x + 23, y: y + 12 }, end: { x: x + 26, y: y + 15 }, thickness: 2.4, color: white });
}

function drawBrandMark(page: PDFPage, logo: PDFImage | undefined) {
  const x = 42;
  if (logo) {
    const ratio = logo.width / logo.height;
    const width = ratio >= 1 ? BRAND_MARK_SIZE : BRAND_MARK_SIZE * ratio;
    const height = ratio >= 1 ? BRAND_MARK_SIZE / ratio : BRAND_MARK_SIZE;
    const y = HEADER_CENTER_Y - height / 2;
    page.drawImage(logo, { x, y, width, height });
    return x + width + BRAND_TEXT_GAP;
  }

  const y = HEADER_CENTER_Y - 17;
  drawFlowDockerFallbackMark(page, x, y);
  return x + 34 + BRAND_TEXT_GAP;
}

class CompletionCertificateService {
  async appendApprovalCertificate(input: { documentId: number; tenantId: number; fileBytes: Uint8Array }) {
    const document = await prisma.documents.findFirst({
      where: { id: input.documentId, tenant_id: input.tenantId },
      include: {
        tenant: { select: { name: true, logo_url: true } },
        owner: { select: { full_name: true, email: true } },
        sign_request: { select: { signers: { select: { id: true, name: true, email: true, status: true, signed_at: true, ip_address: true }, orderBy: { signing_order: "asc" } } } },
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
    const completedSigners = (document?.sign_request?.signers || []).filter((signer) => ["signed", "completed"].includes(signer.status || "")) as CertificateSigner[];
    const approvals = (run?.status === "completed" ? run.approvals : []) as CertificateApproval[];
    if (!document || (approvals.length === 0 && completedSigners.length === 0)) {
      return { fileBytes: Buffer.from(input.fileBytes), applied: false };
    }

    const pdf = await PDFDocument.load(input.fileBytes);
    const font = await embedUnicodeFont(pdf, false);
    const boldFont = await embedUnicodeFont(pdf, true);
    const tenantLogo = await loadTenantLogo(pdf, document.tenant?.logo_url);
    const productLogo = tenantLogo ? undefined : await loadProductLogo(pdf);
    const originalPageCount = pdf.getPageCount();
    const sections: Array<{ kind: "approval"; rows: CertificateApproval[] } | { kind: "signing"; rows: CertificateSigner[] }> = [
      ...chunks(approvals, APPROVAL_ROWS_PER_PAGE).map((rows) => ({ kind: "approval" as const, rows })),
      ...chunks(completedSigners, SIGNER_ROWS_PER_PAGE).map((rows) => ({ kind: "signing" as const, rows })),
    ];

    sections.forEach((section, pageIndex) => {
      const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      // The true FlowDocker mark sits directly on this light-blue header;
      // there is intentionally no mock logo or separate white badge.
      page.drawRectangle({ x: 0, y: HEADER_BOTTOM, width: PAGE_WIDTH, height: HEADER_HEIGHT, color: rgb(0.9333, 0.9569, 0.9843) });
      page.drawRectangle({ x: 0, y: HEADER_BOTTOM, width: PAGE_WIDTH, height: 4, color: rgb(0.0902, 0.4118, 0.8784) });
      const headingX = drawBrandMark(page, tenantLogo || productLogo);
      // PDF text uses its baseline as the y origin. This optical offset keeps
      // the two-line text block centered with the logo and the header bounds.
      const subtitleY = HEADER_CENTER_Y - (boldFont.heightAtSize(20) + font.heightAtSize(9) + 5) / 2 + 7;
      const titleY = subtitleY + font.heightAtSize(9) + 5;
      page.drawText("CERTIFICATE OF COMPLETION", { x: headingX, y: titleY, size: 20, font: boldFont, color: rgb(0.0863, 0.2275, 0.4) });
      const subtitle = section.kind === "approval" ? "Approval workflow completion record" : "Electronic signing completion record";
      page.drawText(subtitle, { x: headingX, y: subtitleY, size: 9, font, color: rgb(0.3255, 0.4392, 0.5608) });

      let y = HEADER_BOTTOM - 32;
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
        drawText(page, safeText(run?.workflow.name || "Signing workflow", 52), 125, y, font, 8);
        drawText(page, "Run", 330, y, boldFont, 8);
        drawText(page, String(run?.run_number || "-"), 425, y, font, 8);
        y -= 18;
        drawText(page, "Owner", 42, y, boldFont, 8);
        drawText(page, safeText(document.owner?.full_name || document.owner?.email, 52), 125, y, font, 8);
        drawText(page, "Completed", 330, y, boldFont, 8);
        drawText(page, formatTimestamp(run?.completed_at || completedSigners[completedSigners.length - 1]?.signed_at), 425, y, font, 6.5);
        y -= 30;
      }

      const sectionTitle = section.kind === "approval" ? "APPROVAL HISTORY" : "SIGNING HISTORY";
      page.drawRectangle({ x: 36, y: y - 18, width: PAGE_WIDTH - 72, height: 22, color: section.kind === "approval" ? rgb(0.9, 0.94, 0.98) : rgb(0.9, 0.97, 0.92) });
      drawText(page, sectionTitle, 42, y - 10, boldFont, 7);
      y -= 28;

      page.drawRectangle({ x: 36, y: y - 18, width: PAGE_WIDTH - 72, height: 22, color: rgb(0.96, 0.97, 0.98) });
      if (section.kind === "approval") {
        drawText(page, "Step", 42, y - 10, boldFont, 7);
        drawText(page, "Approver", 82, y - 10, boldFont, 7);
        drawText(page, "Outcome", 300, y - 10, boldFont, 7);
        drawText(page, "Timestamp", 375, y - 10, boldFont, 7);
      } else {
        drawText(page, "Signer", 42, y - 10, boldFont, 7);
        drawText(page, "Outcome", 245, y - 10, boldFont, 7);
        drawText(page, "Timestamp", 330, y - 10, boldFont, 7);
        drawText(page, "IP address", 448, y - 10, boldFont, 7);
      }
      y -= 28;

      if (section.kind === "approval") {
        section.rows.forEach((approval) => {
          drawText(page, String(approval.workflow_step.step_order), 42, y, font, 7);
          drawText(page, safeText(approval.approver.full_name || approval.approver.email, 34), 82, y, font, 7);
          drawText(page, outcomeLabel(approval.action), 300, y, boldFont, 7);
          drawText(page, formatTimestamp(approval.acted_at), 375, y, font, 6.5);
          y -= 12;
          drawText(page, safeText(approval.workflow_step.step_name, 45), 82, y, font, 6.5);
          if (approval.comment) drawText(page, safeText(approval.comment, 48), 300, y, font, 6.5);
          y -= 17;
          page.drawLine({ start: { x: 42, y: y + 8 }, end: { x: PAGE_WIDTH - 42, y: y + 8 }, thickness: 0.3, color: rgb(0.82, 0.84, 0.87) });
        });
      } else {
        section.rows.forEach((signer) => {
          drawText(page, safeText(signer.name || signer.email, 32), 42, y, font, 7);
          drawText(page, signer.status?.toUpperCase() || "SIGNED", 245, y, boldFont, 7);
          drawText(page, formatTimestamp(signer.signed_at), 330, y, font, 6.25);
          drawText(page, safeText(signer.ip_address || "Not recorded", 18), 448, y, font, 6.5);
          y -= 16;
          page.drawLine({ start: { x: 42, y: y + 8 }, end: { x: PAGE_WIDTH - 42, y: y + 8 }, thickness: 0.3, color: rgb(0.82, 0.84, 0.87) });
        });
      }

      page.drawLine({ start: { x: 42, y: 58 }, end: { x: PAGE_WIDTH - 42, y: 58 }, thickness: 0.5, color: rgb(0.55, 0.6, 0.66) });
      drawText(page, `Document ID ${document.id} | Workflow run ${run?.run_number || "-"} | Certificate page ${pageIndex + 1}/${sections.length}`, 42, 42, font, 6.5);
    });

    return { fileBytes: Buffer.from(await pdf.save()), applied: true };
  }
}

export const completionCertificateService = new CompletionCertificateService();
