import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { normalizeStoredFieldBox, pctToPdfBox } from './coordinate.helper';

const prisma = new PrismaClient();

export class PdfGenerationService {
  private readonly fieldPaddingPt = 2;
  /**
   * Sanitize text to remove Vietnamese diacritics for StandardFonts
   */
  private sanitizeText(text: string): string {
    if (!text) return '';
    
    // Simple transliteration map for Vietnamese
    const map: Record<string, string> = {
      'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
      'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
      'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
      'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
      'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
      'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
      'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
      'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
      'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
      'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
      'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
      'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
      'đ': 'd', 'Đ': 'D',
      'À': 'A', 'Á': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A',
      'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A',
      'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A',
      'È': 'E', 'É': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E',
      'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E',
      'Ì': 'I', 'Í': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I',
      'Ò': 'O', 'Ó': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O',
      'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O',
      'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O',
      'Ù': 'U', 'Ú': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U',
      'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U',
      'Ỳ': 'Y', 'Ý': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y',
    };
    
    return text.split('').map(char => map[char] || char).join('');
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
    const fieldValues: any[] = [];

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
    const originalPdfPath = path.resolve(__dirname, '../../../', signRequest.document.file_path);
    if (!fs.existsSync(originalPdfPath)) {
      throw new Error(`Original PDF not found: ${originalPdfPath}`);
    }

    const originalPdfBytes = fs.readFileSync(originalPdfPath);
    const pdfDoc = await PDFDocument.load(originalPdfBytes);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    console.log(`[Progressive PDF] Loaded PDF with ${pages.length} pages`);

    // 5. Draw signatures and field values on PDF
    for (const fieldValue of fieldValues) {
      await this.drawFieldValue(pdfDoc, pages, fieldValue, font);
    }

    // 6. Add watermark if needed
    if (options.addWatermark) {
      await this.addWatermark(pdfDoc);
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
  private async addWatermark(pdfDoc: PDFDocument): Promise<void> {
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const text = 'CHUA HOAN THANH';
    const fontSize = 60;
    
    for (const page of pages) {
      const { width, height } = page.getSize();
      
      // Calculate text width for centering
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      
      // Calculate diagonal angle (from bottom-left to top-right)
      const angle = Math.atan2(height, width) * (180 / Math.PI); // Convert to degrees
      
      // Calculate center position
      const centerX = width / 2;
      const centerY = height / 2;
      
      // Draw multiple diagonal watermarks for better coverage
      const positions = [
        { x: centerX, y: centerY }, // Center
        { x: centerX - width / 3, y: centerY - height / 3 }, // Bottom-left
        { x: centerX + width / 3, y: centerY + height / 3 }, // Top-right
      ];
      
      for (const pos of positions) {
        page.drawText(text, {
          x: pos.x - textWidth / 2,
          y: pos.y,
          size: fontSize,
          font: font,
          color: rgb(1, 0, 0),
          opacity: 0.15,
          rotate: { angle: angle, type: 'degrees' } as any,
        });
      }
    }
  }

  /**
   * Save progressive PDF to storage
   */
  private async saveProgressivePdf(
    pdfBytes: Uint8Array,
    document: any,
    isCompleted: boolean
  ): Promise<string> {
    const timestamp = Date.now();
    const prefix = isCompleted ? 'signed' : 'signing';
    const fileName = `${prefix}_${timestamp}_${document.id}.pdf`;

    // Extract tenant ID from file path
    const pathParts = document.file_path.split(/[/\\]/);
    const tenantId = pathParts[1] || '1';

    // Create path
    const filePath = path.join('storage', tenantId, fileName);
    const fullPath = path.resolve(__dirname, '../../../', filePath);

    // Ensure directory exists
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(fullPath, pdfBytes);

    console.log(`[Progressive PDF] Saved to: ${filePath}`);
    console.log(`[Progressive PDF] Size: ${pdfBytes.length} bytes`);

    return filePath;
  }

  /**
   * Cleanup old signing files for a document
   */
  private async cleanupOldSigningFiles(documentId: number, currentFilePath: string): Promise<void> {
    try {
      // Get document to find tenant folder
      const document = await prisma.documents.findUnique({
        where: { id: documentId },
        select: { file_path: true, signed_file_path: true }
      });

      if (!document) return;

      // Extract tenant ID
      const pathParts = document.file_path.split(/[/\\]/);
      const tenantId = pathParts[1] || '1';
      const storageDir = path.resolve(__dirname, '../../../storage', tenantId);

      if (!fs.existsSync(storageDir)) return;

      // Find all signing_* files for this document
      const files = fs.readdirSync(storageDir);
      const signingFiles = files.filter(f => 
        f.startsWith(`signing_`) && 
        f.endsWith(`_${documentId}.pdf`) &&
        !currentFilePath.includes(f) // Don't delete current file
      );

      // Delete old files
      for (const file of signingFiles) {
        const filePath = path.join(storageDir, file);
        fs.unlinkSync(filePath);
        console.log(`[Progressive PDF] Deleted old file: ${file}`);
      }

      console.log(`[Progressive PDF] Cleaned up ${signingFiles.length} old files`);
    } catch (error: any) {
      console.error(`[Progressive PDF] Cleanup error: ${error.message}`);
      // Don't throw - cleanup is not critical
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
    const fieldValues: any[] = [];

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
    const originalPdfPath = path.resolve(__dirname, '../../../', signRequest.document.file_path);
    if (!fs.existsSync(originalPdfPath)) {
      throw new Error(`Original PDF not found: ${originalPdfPath}`);
    }

    const originalPdfBytes = fs.readFileSync(originalPdfPath);
    const pdfDoc = await PDFDocument.load(originalPdfBytes);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    console.log(`[PDF Generation] Loaded PDF with ${pages.length} pages`);

    // 5. Draw signatures and field values on PDF
    for (const fieldValue of fieldValues) {
      await this.drawFieldValue(pdfDoc, pages, fieldValue, font);
    }

    // 6. Add audit trail page
    await this.createAuditTrailPage(pdfDoc, signRequest);

    // 7. Save signed PDF
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
    fieldValue: any,
    font: any
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

    if (field.type === 'signature' && fieldValue.value) {
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
      } catch (error: any) {
        console.error(`[PDF Generation] Failed to draw signature: ${error.message}`);
      }
    } else if (field.type === 'text' || field.type === 'date') {
      // Draw text - sanitize Vietnamese characters
      const text = String(fieldValue.value || '');
      const sanitizedText = this.sanitizeText(text);
      page.drawText(sanitizedText, {
        x: x + this.fieldPaddingPt,
        y: y + Math.max(this.fieldPaddingPt, fieldHeight / 2 - 6),
        size: Math.min(12, Math.max(8, fieldHeight * 0.45)),
        font: font,
        color: rgb(0, 0, 0),
      });
      console.log(`[PDF Generation] Drew text "${text}" (sanitized: "${sanitizedText}") on page ${field.page}`);
    }
  }

  /**
   * Create audit trail page (Certificate of Completion) - Compact Layout
   */
  private async createAuditTrailPage(
    pdfDoc: PDFDocument,
    signRequest: any
  ): Promise<void> {
    console.log('[PDF Generation] Creating audit trail page');

    let page = pdfDoc.addPage([595, 842]); // A4 size
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const smallFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

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
    const docTitle = this.sanitizeText(signRequest.document.title || 'Untitled');
    const docNumber = signRequest.document.document_number || 'N/A';
    const createdDate = signRequest.document.created_at 
      ? new Date(signRequest.document.created_at).toLocaleString('vi-VN')
      : new Date().toLocaleString('vi-VN');
    const completedDate = new Date().toLocaleString('vi-VN');
    
    // Left column
    page.drawText('Ten tai lieu:', { x: 40, y: y, size: 7, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(docTitle.substring(0, 40), { x: 110, y: y, size: 7, font: font, color: rgb(0.2, 0.2, 0.2) });
    
    y -= 10;
    page.drawText('Ngay tao:', { x: 40, y: y, size: 7, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(createdDate, { x: 110, y: y, size: 7, font: font, color: rgb(0.2, 0.2, 0.2) });
    
    y -= 10;
    page.drawText('So trang:', { x: 40, y: y, size: 7, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(pdfDoc.getPageCount().toString(), { x: 110, y: y, size: 7, font: font, color: rgb(0.2, 0.2, 0.2) });
    
    y -= 10;
    page.drawText('Nguoi tao:', { x: 40, y: y, size: 7, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    const ownerName = signRequest.document.owner 
      ? this.sanitizeText(signRequest.document.owner.full_name || signRequest.document.owner.email)
      : 'Unknown';
    page.drawText(ownerName.substring(0, 30), { x: 110, y: y, size: 7, font: font, color: rgb(0.2, 0.2, 0.2) });
    
    // Right column
    y += 30;
    page.drawText('Ma tai lieu:', { x: 300, y: y, size: 7, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(docNumber, { x: 370, y: y, size: 7, font: font, color: rgb(0.2, 0.2, 0.2) });
    
    y -= 10;
    page.drawText('Ngay gui:', { x: 300, y: y, size: 7, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(createdDate, { x: 370, y: y, size: 7, font: font, color: rgb(0.2, 0.2, 0.2) });
    
    y -= 10;
    page.drawText('Trang thai:', { x: 300, y: y, size: 7, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    page.drawText('Hoan thanh', { x: 370, y: y, size: 7, font: font, color: rgb(0, 0.6, 0) });
    
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
      
      page.drawText('LICH SU PHE DUYET', {
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
        { x: 40, width: 120, label: 'Nguoi phe duyet' },
        { x: 165, width: 140, label: 'Email' },
        { x: 310, width: 60, label: 'Trang thai' },
        { x: 375, width: 70, label: 'Ngay gio' },
        { x: 450, width: 110, label: 'Ghi chu' }
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
        const approverName = this.sanitizeText(approval.approver.full_name || 'Unknown');
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
          const comment = this.sanitizeText(approval.comment).substring(0, 18);
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
    
    page.drawText('LICH SU KY', {
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
      { x: 40, width: 120, label: 'Nguoi ky' },
      { x: 165, width: 140, label: 'Email' },
      { x: 310, width: 60, label: 'Trang thai' },
      { x: 375, width: 70, label: 'Ngay gio' },
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
      const signerName = this.sanitizeText(signer.name || 'Unknown');
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
        : (signer.type === 'internal' ? 'Internal' : 'External');
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
    document: any
  ): Promise<string> {
    // Create filename
    const signedFileName = `signed_${Date.now()}_${document.id}.pdf`;

    // Extract tenant ID from file path
    const pathParts = document.file_path.split(/[/\\]/);
    const tenantId = pathParts[1] || '1';

    // Create path
    const signedFilePath = path.join('storage', tenantId, signedFileName);
    const fullPath = path.resolve(__dirname, '../../../', signedFilePath);

    // Ensure directory exists
    const signedDir = path.dirname(fullPath);
    if (!fs.existsSync(signedDir)) {
      fs.mkdirSync(signedDir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(fullPath, signedPdfBytes);

    console.log(`[PDF Generation] Saved to: ${signedFilePath}`);
    console.log(`[PDF Generation] Size: ${signedPdfBytes.length} bytes`);

    return signedFilePath;
  }
}

export const pdfGenerationService = new PdfGenerationService();
