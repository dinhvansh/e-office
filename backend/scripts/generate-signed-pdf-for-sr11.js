const { PrismaClient } = require('@prisma/client');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function generateSignedPdf() {
  console.log('\n📄 Generating Signed PDF for Sign Request 11\n');
  
  try {
    // Load sign request
    const signRequest = await prisma.sign_requests.findUnique({
      where: { id: 11 },
      include: {
        document: true,
        signers: {
          orderBy: { signing_order: 'asc' }
        }
      }
    });

    if (!signRequest) {
      throw new Error('Sign request not found');
    }

    console.log('Document:', signRequest.document.title);
    console.log('Signers:', signRequest.signers.length);

    // Load field values
    const fieldValues = await prisma.sign_request_field_values.findMany({
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

    console.log('Field values:', fieldValues.length);

    // Load original PDF
    const originalPdfPath = path.resolve(__dirname, '../', signRequest.document.file_path);
    if (!fs.existsSync(originalPdfPath)) {
      throw new Error(`Original PDF not found: ${originalPdfPath}`);
    }

    const originalPdfBytes = fs.readFileSync(originalPdfPath);
    const pdfDoc = await PDFDocument.load(originalPdfBytes);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    console.log('PDF loaded:', pages.length, 'pages');

    // Draw signatures
    for (const fieldValue of fieldValues) {
      const field = fieldValue.field;
      const page = pages[field.page - 1];

      if (!page) continue;

      const { width: pageWidth, height: pageHeight } = page.getSize();
      const x = (field.x / 100) * pageWidth;
      const y = pageHeight - ((field.y / 100) * pageHeight);
      const fieldWidth = field.width ? (field.width / 100) * pageWidth : 200;
      const fieldHeight = field.height ? (field.height / 100) * pageHeight : 50;

      if (field.type === 'signature' && fieldValue.value) {
        try {
          const base64Data = fieldValue.value.replace(/^data:image\/\w+;base64,/, '');
          const imageBytes = Buffer.from(base64Data, 'base64');

          let image;
          if (fieldValue.value.includes('image/png')) {
            image = await pdfDoc.embedPng(imageBytes);
          } else {
            image = await pdfDoc.embedJpg(imageBytes);
          }

          page.drawImage(image, {
            x: x,
            y: y - fieldHeight,
            width: fieldWidth,
            height: fieldHeight,
          });

          console.log(`✅ Drew signature for ${fieldValue.signer.name}`);
        } catch (error) {
          console.error(`❌ Failed to draw signature: ${error.message}`);
        }
      }
    }

    // Add audit trail page
    console.log('\n📋 Adding audit trail page...');
    const auditPage = pdfDoc.addPage([595, 842]);
    let y = 750;

    // Header
    auditPage.drawText('Certificate of Completion', {
      x: 150,
      y: y,
      size: 24,
      font: boldFont,
      color: rgb(0, 0.4, 0.8)
    });

    y -= 50;

    // Document info
    auditPage.drawText(`Document: ${signRequest.document.title || 'Untitled'}`, {
      x: 50, y: y, size: 12, font: font
    });
    y -= 20;

    auditPage.drawText(`Document Number: ${signRequest.document.document_number || 'N/A'}`, {
      x: 50, y: y, size: 12, font: font
    });
    y -= 20;

    auditPage.drawText(`Completed: ${new Date().toLocaleString('vi-VN')}`, {
      x: 50, y: y, size: 12, font: font
    });
    y -= 40;

    // Divider
    auditPage.drawLine({
      start: { x: 50, y: y },
      end: { x: 545, y: y },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7)
    });
    y -= 30;

    // Signing history
    auditPage.drawText('Signing History', {
      x: 50, y: y, size: 16, font: boldFont
    });
    y -= 30;

    // Signers
    for (const [index, signer] of signRequest.signers.entries()) {
      auditPage.drawRectangle({
        x: 50,
        y: y - 80,
        width: 495,
        height: 85,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1
      });

      // Remove Vietnamese diacritics for now (TODO: use Unicode font)
      const cleanName = signer.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const cleanRole = (signer.role || 'Signer').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      auditPage.drawText(`${index + 1}. ${cleanName} - ${cleanRole}`, {
        x: 60, y: y - 20, size: 12, font: boldFont
      });

      auditPage.drawText(`Email: ${signer.email}`, {
        x: 60, y: y - 35, size: 10, font: font
      });

      const signedDate = signer.signed_at
        ? new Date(signer.signed_at).toLocaleString('vi-VN')
        : 'Not signed';

      auditPage.drawText(`Signed: ${signedDate}`, {
        x: 60, y: y - 50, size: 10, font: font
      });

      const statusText = signer.status === 'signed' || signer.status === 'completed' ? '[X] Signed' : '[ ] Pending';
      const statusColor = signer.status === 'signed' || signer.status === 'completed'
        ? rgb(0, 0.6, 0)
        : rgb(0.6, 0.6, 0);

      auditPage.drawText(`Status: ${statusText}`, {
        x: 60, y: y - 65, size: 10, font: font, color: statusColor
      });

      y -= 100;
    }

    y -= 20;

    // Verification
    auditPage.drawLine({
      start: { x: 50, y: y },
      end: { x: 545, y: y },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7)
    });
    y -= 30;

    auditPage.drawText('Verification', {
      x: 50, y: y, size: 14, font: boldFont
    });
    y -= 20;

    auditPage.drawText('This document was signed using E-Office Digital Signature System', {
      x: 50, y: y, size: 10, font: font, color: rgb(0.5, 0.5, 0.5)
    });
    y -= 15;

    auditPage.drawText(`Document ID: ${signRequest.document.id}`, {
      x: 50, y: y, size: 9, font: font, color: rgb(0.5, 0.5, 0.5)
    });

    // Save PDF
    console.log('\n💾 Saving signed PDF...');
    const signedPdfBytes = await pdfDoc.save();

    const signedFileName = `signed_${Date.now()}_${signRequest.document.id}.pdf`;
    const pathParts = signRequest.document.file_path.split(/[/\\]/);
    const tenantId = pathParts[1] || '1';
    const signedFilePath = path.join('storage', tenantId, signedFileName);
    const fullPath = path.resolve(__dirname, '../', signedFilePath);

    const signedDir = path.dirname(fullPath);
    if (!fs.existsSync(signedDir)) {
      fs.mkdirSync(signedDir, { recursive: true });
    }

    fs.writeFileSync(fullPath, signedPdfBytes);

    console.log('✅ Saved to:', signedFilePath);
    console.log('   Size:', signedPdfBytes.length, 'bytes');

    // Update document
    await prisma.documents.update({
      where: { id: signRequest.document_id },
      data: {
        signed_file_path: signedFilePath,
        status: 'completed'
      }
    });

    console.log('✅ Document updated');
    console.log('\n🎉 You can now test download at:');
    console.log(`   http://localhost:3000/sign-requests/11/internal-sign`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

generateSignedPdf();
