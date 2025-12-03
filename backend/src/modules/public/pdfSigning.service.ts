import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { ApiError } from '../../core/errors/api-error';

const prisma = new PrismaClient();

export class PdfSigningService {
  /**
   * Generate signed PDF with signatures embedded
   */
  async generateSignedPdf(signRequestId: number): Promise<Buffer> {
    // Get sign request with document and signers
    const signRequest = await prisma.sign_requests.findUnique({
      where: { id: signRequestId },
      include: {
        document: true,
        signers: {
          where: {
            OR: [
              { status: 'signed' },
              { status: 'completed' }
            ]
          },
          orderBy: { signing_order: 'asc' }
        },
        fields: {
          include: {
            values: true
          }
        }
      }
    });

    if (!signRequest) {
      throw ApiError.notFound('Sign request not found');
    }

    // Read original PDF
    const originalPdfPath = path.resolve(signRequest.document.file_path);
    if (!fs.existsSync(originalPdfPath)) {
      throw ApiError.notFound('Original PDF file not found');
    }

    const originalPdfBytes = fs.readFileSync(originalPdfPath);
    const pdfDoc = await PDFDocument.load(originalPdfBytes);

    // Embed font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Add signatures to PDF
    for (const signer of signRequest.signers) {
      // Find signature fields for this signer
      const signatureFields = signRequest.fields.filter(
        f => f.assigned_signer_id === signer.id && f.type === 'signature'
      );

      for (const field of signatureFields) {
        const pageIndex = (field.page || 1) - 1;
        const page = pdfDoc.getPages()[pageIndex];
        
        if (!page) continue;

        const { width: pageWidth, height: pageHeight } = page.getSize();

        // Convert percentage to actual coordinates
        const x = (field.x / 100) * pageWidth;
        const y = pageHeight - ((field.y / 100) * pageHeight) - ((field.height / 100) * pageHeight);
        const width = (field.width / 100) * pageWidth;
        const height = (field.height / 100) * pageHeight;

        // Draw signature box with white background
        page.drawRectangle({
          x,
          y,
          width,
          height,
          color: rgb(1, 1, 1), // White background
          borderColor: rgb(0, 0.53, 0.71),
          borderWidth: 1,
        });

        // If signature data exists (base64 image), embed it
        if (signer.signature_data) {
          try {
            // Remove data URL prefix if exists
            const base64Data = signer.signature_data.replace(/^data:image\/\w+;base64,/, '');
            const imageBytes = Buffer.from(base64Data, 'base64');
            
            // Embed image (try PNG first, fallback to JPG)
            let image;
            try {
              image = await pdfDoc.embedPng(imageBytes);
            } catch {
              image = await pdfDoc.embedJpg(imageBytes);
            }

            // Draw image
            const imgDims = image.scale(0.5);
            const imgWidth = Math.min(imgDims.width, width - 4);
            const imgHeight = Math.min(imgDims.height, height - 20);

            page.drawImage(image, {
              x: x + (width - imgWidth) / 2,
              y: y + 18,
              width: imgWidth,
              height: imgHeight,
            });
          } catch (error) {
            console.error('Failed to embed signature image:', error);
            // Fallback to text
            page.drawText('SIGNED', {
              x: x + 5,
              y: y + height / 2,
              size: 10,
              font: boldFont,
              color: rgb(0, 0.53, 0.71),
            });
          }
        }

        // Draw signer name and date
        const signerName = signer.name || signer.email || 'Unknown';
        const signedDate = signer.signed_at 
          ? new Date(signer.signed_at).toLocaleDateString('vi-VN')
          : new Date().toLocaleDateString('vi-VN');

        page.drawText(signerName, {
          x: x + 5,
          y: y + 5,
          size: 8,
          font,
          color: rgb(0, 0, 0),
        });

        page.drawText(signedDate, {
          x: x + width - 60,
          y: y + 5,
          size: 7,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });
      }

      // Add date fields
      const dateFields = signRequest.fields.filter(
        f => f.assigned_signer_id === signer.id && f.type === 'date'
      );

      for (const field of dateFields) {
        const fieldValue = field.values.find(fv => fv.signer_id === signer.id);
        if (!fieldValue) continue;

        const pageIndex = (field.page || 1) - 1;
        const page = pdfDoc.getPages()[pageIndex];
        
        if (!page) continue;

        const { width: pageWidth, height: pageHeight } = page.getSize();
        const x = (field.x / 100) * pageWidth;
        const y = pageHeight - ((field.y / 100) * pageHeight) - ((field.height / 100) * pageHeight);
        const width = (field.width / 100) * pageWidth;
        const height = (field.height / 100) * pageHeight;

        // Draw date box
        page.drawRectangle({
          x,
          y,
          width,
          height,
          borderColor: rgb(0.7, 0.7, 0.7),
          borderWidth: 1,
        });

        // Draw date value
        page.drawText(String(fieldValue.value), {
          x: x + 5,
          y: y + height / 2 - 4,
          size: 10,
          font,
          color: rgb(0, 0, 0),
        });
      }
    }

    // Add watermark "SIGNED" on first page
    const firstPage = pdfDoc.getPages()[0];
    const { width, height } = firstPage.getSize();
    
    firstPage.drawText('SIGNED', {
      x: width - 100,
      y: height - 30,
      size: 12,
      font: boldFont,
      color: rgb(0, 0.7, 0),
      opacity: 0.5,
    });

    // Add completion timestamp
    const completedAt = new Date(); // Use current time as completion time
    firstPage.drawText(`Completed: ${completedAt.toLocaleString('vi-VN')}`, {
      x: width - 200,
      y: height - 50,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity: 0.7,
    });

    // Save modified PDF
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}

export const pdfSigningService = new PdfSigningService();
