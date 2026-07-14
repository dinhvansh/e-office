import { PDFDocument, rgb, PDFPage, PDFFont } from 'pdf-lib';
import type { documents, Prisma, sign_request_fields, sign_requests, signers, users } from '@prisma/client';
import fontkit from 'fontkit';
import { prisma } from '../../config/prisma';
import * as fs from 'fs';
import * as path from 'path';
import { storageService } from '../../core/storage/storage.service';
import { readStoredFile } from '../../core/storage/fileStorage';
import { normalizeStoredFieldBox, pctToPdfBox } from './coordinate.helper';
import {
  applyWatermarkToPdfBytes,
  getTenantWatermarkConfig,
  resolveWatermarkVariantForStatus,
} from '../settings/watermark.helper';

type PdfFieldValue =
  | Prisma.sign_request_field_valuesGetPayload<{ include: { field: true; signer: true } }>
  | { field: sign_request_fields; signer: signers; value: string };

type PdfSignRequest = sign_requests & {
  document: documents & { owner: users | null };
  signers: signers[];
};

type StoredDocument = Pick<documents, 'id' | 'file_path'>;


export class PdfGenerationService {
  private readonly fieldPaddingPt = 2;
  private readonly unicodeFontPath = process.env.PDF_UNICODE_FONT_PATH || '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf';
  private readonly unicodeBoldFontPath = process.env.PDF_UNICODE_BOLD_FONT_PATH || '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf';

  private async embedUnicodeFont(pdfDoc: PDFDocument, bold = false) {
    const fontPath = bold ? this.unicodeBoldFontPath : this.unicodeFontPath;
    if (!fs.existsSync(fontPath)) {
      throw new Error(`Unicode PDF font is unavailable: ${fontPath}`);
    }
    pdfDoc.registerFontkit(fontkit);
    // pdf-lib's current fontkit integration cannot subset fontkit v2 fonts
    // reliably (`subset.encodeStream` is absent). Embed the approved Unicode
    // font in full so artifact generation remains deterministic.
    return pdfDoc.embedFont(fs.readFileSync(fontPath), { subset: false });
  }
  /**
   * Generate progressive PDF after each signature
   * @param signRequestId - Sign request ID
   * @param options - Generation options
   * @returns File path of generated PDF
   */
  async generateProgressivePdf(
    signRequestId: number,
    options: {
      includeAuditTrail?: boolean;
      addWatermark?: boolean;
    } = {}
  ): Promise<string> {
    console.log(`[Progressive PDF] Starting for sign request ${signRequestId}`);
    console.log(`[Progressive PDF] Options:`, options);

    // 1. Load sign request with all related data
    const signRequest = await prisma.sign_requests.findUnique({
      where: { id: signRequestId },
      include: {
        document: {
          include: {
            owner: true
          }
        },
        signers: {
          orderBy: { signing_order: 'asc' }
        }
      }
    });

    if (!signRequest) {
      throw new Error(`Sign request ${signRequestId} not found`);
    }

    console.log(`[Progressive PDF] Document: ${signRequest.document.title}`);

    // 2. Load fields
    const fields = await prisma.sign_request_fields.findMany({
      where: { sign_request_id: signRequestId },
      orderBy: { id: 'asc' }
    });

    console.log(`[Progressive PDF] Found ${fields.length} fields`);

    // 3. Prepare field values from both sources (only signed ones)
    const fieldValues: PdfFieldValue[] = [];

    // 3a. Load from sign_request_field_values (external signing)
    const externalFieldValues = await prisma.sign_request_field_values.findMany({
      where: {
        signer_id: {
          in: signRequest.signers.filter(s => s.status === 'signed' || s.status === 'completed').map(s => s.id)
        }
      },
      include: {
        field: true,
        signer: true
      }
    });

    fieldValues.push(...externalFieldValues);

    // 3b. Load from signers.position_data (internal signing) - only signed signers
    for (const signer of signRequest.signers) {
      if ((signer.status === 'signed' || signer.status === 'completed') && 
          signer.position_data && typeof signer.position_data === 'object') {
        const fieldSignatures = signer.position_data as Record<string, string>;
        
        for (const [fieldIdStr, signatureData] of Object.entries(fieldSignatures)) {
          const fieldId = parseInt(fieldIdStr);
          const field = fields.find(f => f.id === fieldId);
          
          if (field) {
            fieldValues.push({
              field: field,
              signer: signer,
              value: signatureData
            });
          }
        }
      }
    }

    console.log(`[Progressive PDF] Total field values (signed only): ${fieldValues.length}`);

    // 4. Load original PDF
    let originalPdfBytes: Uint8Array;
    try {
      originalPdfBytes = await readStoredFile(storageService, signRequest.document.file_path);
    } catch {
      throw new Error(`Original PDF not found: ${signRequest.document.file_path}`);
    }
    const pdfDoc = await PDFDocument.load(originalPdfBytes);
    const pages = pdfDoc.getPages();
    const font = await this.embedUnicodeFont(pdfDoc);

    console.log(`[Progressive PDF] Loaded PDF with ${pages.length} pages`);

    // 5. Draw signatures and field values on PDF
    for (const fieldValue of fieldValues) {
      await this.drawFieldValue(pdfDoc, pages, fieldValue, font);
    }

    // 6. Add watermark if needed
    if (options.addWatermark) {
      await this.addWatermark(pdfDoc, signRequest.document.tenant_id, signRequest.document.status);
      console.log(`[Progressive PDF] Added watermark`);
    }

    // 7. Add audit trail page if needed
    if (options.includeAuditTrail) {
      await this.createAuditTrailPage(pdfDoc, signRequest);
      console.log(`[Progressive PDF] Added audit trail`);
    }

    // 8. Save PDF with appropriate filename
    const signedPdfBytes = await pdfDoc.save();
    const filePath = await this.saveProgressivePdf(
      signedPdfBytes,
      signRequest.document,
      options.includeAuditTrail || false
    );

    // 9. Cleanup old signing files
    await this.cleanupOldSigningFiles(signRequest.document.id, filePath);

    console.log(`[Progressive PDF] Completed: ${filePath}`);

    return filePath;
  }

  /**
   * Add watermark to all pages
   */
  private async addWatermark(pdfDoc: PDFDocument, tenantId: number, documentStatus?: string | null): Promise<void> {
    const config = await getTenantWatermarkConfig(tenantId);
    const variant = resolveWatermarkVariantForStatus(config, documentStatus || 'in_progress');
    if (!variant) {
      return;
    }

    const updatedBytes = await applyWatermarkToPdfBytes(await pdfDoc.save(), config, {
      ...variant,
      text: variant.text,
    });
    const updatedDoc = await PDFDocument.load(updatedBytes);
    const pages = pdfDoc.getPages();
    const nextPages = updatedDoc.getPages();

    while (pages.length > 0) {
      pdfDoc.removePage(0);
      pages.shift();
    }

    const copiedPages = await pdfDoc.copyPages(updatedDoc, nextPages.map((_, index) => index));
    copiedPages.forEach((page) => pdfDoc.addPage(page));
  }

  /**
   * Save progressive PDF to storage
   */
  private async saveProgressivePdf(
    pdfBytes: Uint8Array,
    document: StoredDocument,
    isCompleted: boolean
  ): Promise<string> {
    const timestamp = Date.now();
    const prefix = isCompleted ? 'signed' : 'signing';
    const fileName = `${prefix}_${timestamp}_${document.id}.pdf`;

    // Extract tenant ID from file path
    const pathParts = document.file_path.split(/[/\\]/);
    const tenantId = pathParts[1] || '1';

    const filePath = path.posix.join('storage', tenantId, fileName);
    await storageService.put({ key: filePath, body: pdfBytes, contentType: 'application/pdf' });

    console.log(`[Progressive PDF] Saved to: ${filePath}`);
    console.log(`[Progressive PDF] Size: ${pdfBytes.length} bytes`);

    return filePath;
  }

  /**
   * Cleanup old signing files for a document
   */
  private async cleanupOldSigningFiles(documentId: number, currentFilePath: string): Promise<void> {
    try {
      const document = await prisma.documents.findUnique({
        where: { id: documentId },
        select: { signed_file_path: true }
      });

      const previousKey = document?.signed_file_path;
      if (previousKey && previousKey !== currentFilePath && !path.isAbsolute(previousKey)) {
        await storageService.delete(previousKey);
      }
    } catch (error: unknown) {
      console.error(`[Progressive PDF] Cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Cleanup is best-effort; object stores cannot join the document transaction.
    }
  }

  /**
   * Generate signed PDF with all signatures and audit trail
   */
  async generateSignedPdf(signRequestId: number): Promise<string> {
    console.log(`[PDF Generation] Starting for sign request ${signRequestId}`);

    // 1. Load sign request with all related data
    const signRequest = await prisma.sign_requests.findUnique({
      where: { id: signRequestId },
      include: {
        document: {
          include: {
            owner: true
          }
        },
        signers: {
          orderBy: { signing_order: 'asc' }
        }
      }
    });

    if (!signRequest) {
      throw new Error(`Sign request ${signRequestId} not found`);
    }

    console.log(`[PDF Generation] Document: ${signRequest.document.title}`);

    // 2. Load fields
    const fields = await prisma.sign_request_fields.findMany({
      where: { sign_request_id: signRequestId },
      orderBy: { id: 'asc' }
    });

    console.log(`[PDF Generation] Found ${fields.length} fields`);

    // 3. Prepare field values from both sources
    const fieldValues: PdfFieldValue[] = [];

    // 3a. Load from sign_request_field_values (external signing)
    const externalFieldValues = await prisma.sign_request_field_values.findMany({
      where: {
        signer_id: {
          in: signRequest.signers.map(s => s.id)
        }
      },
      include: {
        field: true,
        signer: true
      }
    });

    fieldValues.push(...externalFieldValues);

    // 3b. Load from signers.position_data (internal signing)
    for (const signer of signRequest.signers) {
      if (signer.position_data && typeof signer.position_data === 'object') {
        const fieldSignatures = signer.position_data as Record<string, string>;
        
        for (const [fieldIdStr, signatureData] of Object.entries(fieldSignatures)) {
          const fieldId = parseInt(fieldIdStr);
          const field = fields.find(f => f.id === fieldId);
          
          if (field) {
            fieldValues.push({
              field: field,
              signer: signer,
              value: signatureData
            });
          }
        }
      }
    }

    console.log(`[PDF Generation] Total field values: ${fieldValues.length}`);

    // 4. Load original PDF
    let originalPdfBytes: Uint8Array;
    try {
      originalPdfBytes = await readStoredFile(storageService, signRequest.document.file_path);
    } catch {
      throw new Error(`Original PDF not found: ${signRequest.document.file_path}`);
    }
    const pdfDoc = await PDFDocument.load(originalPdfBytes);
    const pages = pdfDoc.getPages();
    const font = await this.embedUnicodeFont(pdfDoc);

    console.log(`[PDF Generation] Loaded PDF with ${pages.length} pages`);

    // 5. Draw signatures and field values on PDF
    for (const fieldValue of fieldValues) {
      await this.drawFieldValue(pdfDoc, pages, fieldValue, font);
    }

    // 6. Add audit trail page
    await this.createAuditTrailPage(pdfDoc, signRequest);

    // 7. Apply completed watermark configuration if enabled
    await this.addWatermark(pdfDoc, signRequest.document.tenant_id, 'completed');

    // 8. Save signed PDF
    const signedPdfBytes = await pdfDoc.save();
    const signedFilePath = await this.saveSignedPdf(
      signedPdfBytes,
      signRequest.document
    );

    console.log(`[PDF Generation] Completed: ${signedFilePath}`);

    return signedFilePath;
  }

  /**
   * Draw field value on PDF
   */
  private async drawFieldValue(
    pdfDoc: PDFDocument,
    pages: PDFPage[],
    fieldValue: PdfFieldValue,
    font: PDFFont,
  ): Promise<void> {
    const field = fieldValue.field;
    const page = pages[field.page - 1];

    if (!page) {
      console.warn(`[PDF Generation] Page ${field.page} not found for field ${field.id}`);
      return;
    }

    const { width: pageWidth, height: pageHeight } = page.getSize();
    const pdfBox = pctToPdfBox(normalizeStoredFieldBox(field), pageWidth, pageHeight);
    const x = pdfBox.x;
    const y = pdfBox.y;
    const fieldWidth = pdfBox.width;
    const fieldHeight = pdfBox.height;

    if (field.type === 'signature' && typeof fieldValue.value === 'string' && fieldValue.value) {
      try {
        // Extract base64 data
        const base64Data = fieldValue.value.replace(/^data:image\/\w+;base64,/, '');
        const imageBytes = Buffer.from(base64Data, 'base64');

        // Embed image
        let image;
        if (fieldValue.value.includes('image/png')) {
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          image = await pdfDoc.embedJpg(imageBytes);
        }

        // Draw image
        page.drawImage(image, {
          x: x + this.fieldPaddingPt,
          y: y + this.fieldPaddingPt,
          width: Math.max(0, fieldWidth - this.fieldPaddingPt * 2),
          height: Math.max(0, fieldHeight - this.fieldPaddingPt * 2),
        });

        console.log(`[PDF Generation] Drew signature for ${fieldValue.signer.name} on page ${field.page}`);
      } catch (error: unknown) {
        console.error(`[PDF Generation] Failed to draw signature: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (field.type === 'text' || field.type === 'date') {
      // Noto Sans is embedded above, so preserve Unicode text verbatim.
      const text = String(fieldValue.value || '');
      page.drawText(text, {
        x: x + this.fieldPaddingPt,
        y: y + Math.max(this.fieldPaddingPt, fieldHeight / 2 - 6),
        size: Math.min(12, Math.max(8, fieldHeight * 0.45)),
        font: font,
        color: rgb(0, 0, 0),
      });
      console.log(`[PDF Generation] Drew Unicode text on page ${field.page}`);
    }
  }

  /**
   * Create audit trail page (Certificate of Completion) - Compact Layout
   */
  private async createAuditTrailPage(
    pdfDoc: PDFDocument,
    signRequest: PdfSignRequest,
  ): Promise<void> {
    console.log('[PDF Generation] Creating audit trail page');

    const page = pdfDoc.addPage([595, 842]); // A4 size
    const font = await this.embedUnicodeFont(pdfDoc);
    const boldFont = await this.embedUnicodeFont(pdfDoc, true);

    let y = 800;

    // ✅ Load logo image
    try {
      const logoPath = path.resolve(__dirname, '../../../logo.png');
      if (fs.existsSync(logoPath)) {
        const logoBytes = fs.readFileSync(logoPath);
        const logoImage = await pdfDoc.embedPng(logoBytes);
        const logoDims = logoImage.scale(0.08);
        
        page.drawImage(logoImage, {
          x: 40,
          y: y - 20,
          width: logoDims.width,
          height: logoDims.height,
        });
      }
    } catch (error) {
      console.log('[PDF Generation] Logo not found');
    }

    // ✅ Header - Blue color
    page.drawText('CERTIFICATE OF COMPLETION', {
      x: 200,
      y: y - 15,
      size: 14,
      font: boldFont,
      color: rgb(0, 0.4, 0.8) // Blue
    });

    y -= 35;

    // ✅ Document Info Header (like SignNow)
    const docTitle = signRequest.document.title || 'Untitled';
    const docNumber = signRequest.document.document_number || 'N/A';
    const createdDate = signRequest.document.created_at 
      ? new Date(signRequest.document.created_at).toLocaleString('vi-VN')
      : new Date().toLocaleString('vi-VN');
    
    // Left column
    page.drawText('Tên tài liệu:', { x: 40, y: y, size: 7, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(docTitle.substring(0, 40), { x: 110, y: y, size: 7, font: font, color: rgb(0.2, 0.2, 0.2) });
    
    y -= 10;
    page.drawText('Ngày tạo:', { x: 40, y: y, size: 7, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(createdDate, { x: 110, y: y, size: 7, font: font, color: rgb(0.2, 0.2, 0.2) });
    
    y -= 10;
    page.drawText('Số trang:', { x: 40, y: y, size: 7, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(pdfDoc.getPageCount().toString(), { x: 110, y: y, size: 7, font: font, color: rgb(0.2, 0.2, 0.2) });
    
    y -= 10;
    page.drawText('Người tạo:', { x: 40, y: y, size: 7, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    const ownerName = signRequest.document.owner 
      ? (signRequest.document.owner.full_name || signRequest.document.owner.email)
      : 'Unknown';
    page.drawText(ownerName.substring(0, 30), { x: 110, y: y, size: 7, font: font, color: rgb(0.2, 0.2, 0.2) });
    
    // Right column
    y += 30;
    page.drawText('Mã tài liệu:', { x: 300, y: y, size: 7, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(docNumber, { x: 370, y: y, size: 7, font: font, color: rgb(0.2, 0.2, 0.2) });
    
    y -= 10;
    page.drawText('Ngày gửi:', { x: 300, y: y, size: 7, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(createdDate, { x: 370, y: y, size: 7, font: font, color: rgb(0.2, 0.2, 0.2) });
    
    y -= 10;
    page.drawText('Trạng thái:', { x: 300, y: y, size: 7, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    page.drawText('Hoàn thành', { x: 370, y: y, size: 7, font: font, color: rgb(0, 0.6, 0) });
    
    y -= 20;

    // ✅ COMPACT: Approval History
    const approvals = await prisma.document_approvals.findMany({
      where: { document_id: signRequest.document.id },
      include: { 
        approver: true,
        workflow_step: true
      },
      orderBy: { created_at: 'asc' }
    });

    if (approvals.length > 0) {
      // ✅ Section title with blue background
      page.drawRectangle({
        x: 35,
        y: y - 12,
        width: 525,
        height: 14,
        color: rgb(0, 0.4, 0.8) // Blue
      });
      
      page.drawText('LỊCH SỬ PHÊ DUYỆT', {
        x: 40, y: y - 9, size: 8, font: boldFont, color: rgb(1, 1, 1)
      });
      y -= 15;

      // ✅ SIMPLE TABLE - Same columns as signing
      const tableHeight = approvals.length * 10 + 13;
      
      // Simple border
      page.drawRectangle({
        x: 35,
        y: y - tableHeight,
        width: 525,
        height: tableHeight,
        borderColor: rgb(0.5, 0.5, 0.5),
        borderWidth: 0.5
      });

      // Column headers - same layout as signing table
      const cols = [
        { x: 40, width: 120, label: 'Người phê duyệt' },
        { x: 165, width: 140, label: 'Email' },
        { x: 310, width: 60, label: 'Trạng thái' },
        { x: 375, width: 70, label: 'Ngày giờ' },
        { x: 450, width: 110, label: 'Ghi chú' }
      ];

      // Draw headers
      cols.forEach((col, i) => {
        page.drawText(col.label, {
          x: col.x, y: y - 9, size: 7, font: boldFont, color: rgb(0.3, 0.3, 0.3)
        });
        
        // Vertical line
        if (i < cols.length - 1) {
          page.drawLine({
            start: { x: col.x + col.width, y: y },
            end: { x: col.x + col.width, y: y - tableHeight },
            thickness: 0.3,
            color: rgb(0.7, 0.7, 0.7)
          });
        }
      });

      y -= 13;

      // Header line
      page.drawLine({
        start: { x: 35, y: y },
        end: { x: 560, y: y },
        thickness: 0.5,
        color: rgb(0.5, 0.5, 0.5)
      });

      // Data rows
      for (let index = 0; index < approvals.length; index++) {
        const approval = approvals[index];

        // Column 1: Approver name
        const approverName = approval.approver.full_name || 'Unknown';
        page.drawText(approverName.substring(0, 20), {
          x: 40, y: y - 7, size: 6.5, font: font, color: rgb(0.2, 0.2, 0.2)
        });

        // Column 2: Email (if available)
        const email = approval.approver.email || '';
        page.drawText(email.substring(0, 25), {
          x: 165, y: y - 7, size: 6.5, font: font, color: rgb(0.2, 0.2, 0.2)
        });

        // Column 3: Status
        const statusText = approval.action === 'approved' ? 'Approved' : 'Rejected';
        page.drawText(statusText, {
          x: 310, y: y - 7, size: 6.5, font: font, color: rgb(0.2, 0.2, 0.2)
        });

        // Column 4: Date time
        const actedDate = approval.acted_at
          ? new Date(approval.acted_at).toLocaleString('vi-VN', { 
              day: '2-digit', 
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })
          : 'Pending';
        page.drawText(actedDate, {
          x: 375, y: y - 7, size: 6.5, font: font, color: rgb(0.2, 0.2, 0.2)
        });

        // Column 5: Comment
        if (approval.comment) {
          const comment = approval.comment.substring(0, 18);
          page.drawText(comment, {
            x: 450, y: y - 7, size: 6, font: font, color: rgb(0.4, 0.4, 0.4)
          });
        }

        y -= 10;
      }

      y -= 10;
    }

    // ✅ Signing section with green background
    page.drawRectangle({
      x: 35,
      y: y - 12,
      width: 525,
      height: 14,
      color: rgb(0, 0.6, 0) // Green
    });
    
    page.drawText('LỊCH SỬ KÝ', {
      x: 40, y: y - 9, size: 8, font: boldFont, color: rgb(1, 1, 1)
    });
    y -= 15;

    // ✅ SIMPLE TABLE - Same layout as approval
    const signerTableHeight = signRequest.signers.length * 10 + 13;
    
    // Simple border
    page.drawRectangle({
      x: 35,
      y: y - signerTableHeight,
      width: 525,
      height: signerTableHeight,
      borderColor: rgb(0.5, 0.5, 0.5),
      borderWidth: 0.5
    });

    // Column headers - same as approval table
    const signerCols = [
      { x: 40, width: 120, label: 'Người ký' },
      { x: 165, width: 140, label: 'Email' },
      { x: 310, width: 60, label: 'Trạng thái' },
      { x: 375, width: 70, label: 'Ngày giờ' },
      { x: 450, width: 110, label: 'IP / Auth' }
    ];

    // Draw headers
    signerCols.forEach((col, i) => {
      page.drawText(col.label, {
        x: col.x, y: y - 9, size: 7, font: boldFont, color: rgb(0.3, 0.3, 0.3)
      });
      
      // Vertical line
      if (i < signerCols.length - 1) {
        page.drawLine({
          start: { x: col.x + col.width, y: y },
          end: { x: col.x + col.width, y: y - signerTableHeight },
          thickness: 0.3,
          color: rgb(0.7, 0.7, 0.7)
        });
      }
    });

    y -= 13;

    // Header line
    page.drawLine({
      start: { x: 35, y: y },
      end: { x: 560, y: y },
      thickness: 0.5,
      color: rgb(0.5, 0.5, 0.5)
    });

    // Data rows
    for (let index = 0; index < signRequest.signers.length; index++) {
      const signer = signRequest.signers[index];

      // Column 1: Signer name
      const signerName = signer.name || 'Unknown';
      page.drawText(signerName.substring(0, 20), {
        x: 40, y: y - 7, size: 6.5, font: font, color: rgb(0.2, 0.2, 0.2)
      });

      // Column 2: Email
      page.drawText(signer.email.substring(0, 25), {
        x: 165, y: y - 7, size: 6.5, font: font, color: rgb(0.2, 0.2, 0.2)
      });

      // Column 3: Status
      const statusText = signer.status === 'signed' || signer.status === 'completed' ? 'Signed' : 'Pending';
      page.drawText(statusText, {
        x: 310, y: y - 7, size: 6.5, font: font, color: rgb(0.2, 0.2, 0.2)
      });

      // Column 4: Date time
      const signedDate = signer.signed_at
        ? new Date(signer.signed_at).toLocaleString('vi-VN', { 
            day: '2-digit', 
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })
        : 'Pending';
      page.drawText(signedDate, {
        x: 375, y: y - 7, size: 6.5, font: font, color: rgb(0.2, 0.2, 0.2)
      });

      // Column 5: IP / Auth
      const ipAuth = signer.ip_address 
        ? signer.ip_address 
        : (signer.is_internal ? 'Internal' : 'External');
      page.drawText(ipAuth, {
        x: 450, y: y - 7, size: 6, font: font, color: rgb(0.4, 0.4, 0.4)
      });

      y -= 10;
    }

    y -= 10;

    // ✅ SIMPLE: Verification footer
    page.drawLine({
      start: { x: 35, y: y },
      end: { x: 560, y: y },
      thickness: 0.5,
      color: rgb(0.5, 0.5, 0.5)
    });
    y -= 12;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    page.drawText(`Verification: ${frontendUrl}/verify/${signRequest.id} | Doc ID: ${signRequest.document.id} | Generated: ${new Date().toLocaleString('vi-VN')}`, {
      x: 40, y: y, size: 6, font: font, color: rgb(0.5, 0.5, 0.5)
    });
  }

  /**
   * Save signed PDF to storage
   */
  private async saveSignedPdf(
    signedPdfBytes: Uint8Array,
    document: StoredDocument,
  ): Promise<string> {
    // Create filename
    // A completed sign request has one canonical artifact. A deterministic key
    // makes retries safe if generation succeeds but the following DB update fails.
    const signedFileName = `signed_${document.id}.pdf`;

    // Extract tenant ID from file path
    const pathParts = document.file_path.split(/[/\\]/);
    const tenantId = pathParts[1] || '1';

    const signedFilePath = path.posix.join('storage', tenantId, signedFileName);
    await storageService.put({ key: signedFilePath, body: signedPdfBytes, contentType: 'application/pdf' });

    console.log(`[PDF Generation] Saved to: ${signedFilePath}`);
    console.log(`[PDF Generation] Size: ${signedPdfBytes.length} bytes`);

    return signedFilePath;
  }
}

export const pdfGenerationService = new PdfGenerationService();
