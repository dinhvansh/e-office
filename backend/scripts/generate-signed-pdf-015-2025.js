const { PrismaClient } = require('@prisma/client');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function generateSignedPDF() {
  console.log('\n📄 Generating Signed PDF for Document 015/2025...\n');
  
  try {
    // Get document by number
    const document = await prisma.documents.findFirst({
      where: { document_number: '015/2025' },
      include: {
        sign_request: {
          include: {
            signers: {
              orderBy: { signing_order: 'asc' }
            }
          }
        }
      }
    });

    if (!document) {
      console.log('❌ Document 015/2025 not found');
      return;
    }

    console.log('📋 Document Info:');
    console.log('  ID:', document.id);
    console.log('  Title:', document.title);
    console.log('  File Path:', document.file_path);
    console.log('  Status:', document.status);

    if (!document.sign_request) {
      console.log('❌ No sign request found');
      return;
    }

    console.log('\n👥 Signers:');
    document.sign_request.signers.forEach((signer, i) => {
      console.log(`  ${i + 1}. ${signer.name} - ${signer.status}`);
      console.log(`     Signed: ${signer.signed_at ? 'Yes' : 'No'}`);
      console.log(`     Has Signature: ${signer.signature_data ? 'Yes' : 'No'}`);
    });

    // Check if all signed
    const allSigned = document.sign_request.signers.every(s => 
      s.status === 'signed' || s.status === 'completed'
    );

    if (!allSigned) {
      console.log('\n❌ Not all signers have signed yet');
      return;
    }

    console.log('\n✅ All signers have signed!');
    console.log('\n📄 Loading original PDF...');

    // Load original PDF
    const originalPdfPath = path.resolve(__dirname, '..', document.file_path);
    if (!fs.existsSync(originalPdfPath)) {
      console.log('❌ Original PDF not found:', originalPdfPath);
      return;
    }

    const originalPdfBytes = fs.readFileSync(originalPdfPath);
    const pdfDoc = await PDFDocument.load(originalPdfBytes);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    console.log('✅ PDF loaded, pages:', pages.length);

    // Get field values for each signer
    console.log('\n🔍 Getting field values...');
    const fieldValues = await prisma.sign_request_field_values.findMany({
      where: {
        signer_id: {
          in: document.sign_request.signers.map(s => s.id)
        }
      },
      include: {
        field: true,
        signer: true
      }
    });

    console.log(`Found ${fieldValues.length} field values`);

    // Draw signatures and field values on PDF
    for (const fieldValue of fieldValues) {
      const field = fieldValue.field;
      const page = pages[field.page - 1];
      
      if (!page) {
        console.log(`⚠️  Page ${field.page} not found for field ${field.id}`);
        continue;
      }

      const { width: pageWidth, height: pageHeight } = page.getSize();
      
      // Convert percentage to actual coordinates
      const x = (field.x / 100) * pageWidth;
      const y = pageHeight - ((field.y / 100) * pageHeight);
      const fieldWidth = field.width ? (field.width / 100) * pageWidth : 200;
      const fieldHeight = field.height ? (field.height / 100) * pageHeight : 50;

      if (field.type === 'signature' && fieldValue.value) {
        // Draw signature image
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
            x: x,
            y: y - fieldHeight,
            width: fieldWidth,
            height: fieldHeight,
          });
          
          console.log(`✅ Drew signature for ${fieldValue.signer.name} on page ${field.page}`);
        } catch (error) {
          console.log(`❌ Failed to draw signature: ${error.message}`);
        }
      } else if (field.type === 'text' || field.type === 'date') {
        // Draw text
        const text = String(fieldValue.value || '');
        page.drawText(text, {
          x: x + 5,
          y: y - fieldHeight + 15,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });
        console.log(`✅ Drew text "${text}" on page ${field.page}`);
      }
    }

    // Add signature info at bottom of last page
    const lastPage = pages[pages.length - 1];
    const { height: lastPageHeight } = lastPage.getSize();
    
    let yPos = 50;
    lastPage.drawText('Digital Signatures:', {
      x: 50,
      y: yPos,
      size: 10,
      font: font,
      color: rgb(0, 0, 0.5),
    });
    
    yPos -= 15;
    for (const signer of document.sign_request.signers) {
      const signedDate = signer.signed_at ? new Date(signer.signed_at).toLocaleString('vi-VN') : 'Not signed';
      lastPage.drawText(`${signer.name} - Signed: ${signedDate}`, {
        x: 50,
        y: yPos,
        size: 8,
        font: font,
        color: rgb(0, 0, 0.5),
      });
      yPos -= 12;
    }

    console.log('\n💾 Saving signed PDF...');

    // Save signed PDF
    const signedPdfBytes = await pdfDoc.save();
    
    // Create filename
    const signedFileName = `signed_${Date.now()}_${document.id}.pdf`;
    const tenantId = document.file_path.split('/')[1] || document.file_path.split('\\')[1];
    const signedFilePath = path.join('storage', tenantId, signedFileName);
    
    // Ensure directory exists
    const signedDir = path.dirname(signedFilePath);
    if (!fs.existsSync(signedDir)) {
      fs.mkdirSync(signedDir, { recursive: true });
    }
    
    // Write file
    fs.writeFileSync(signedFilePath, signedPdfBytes);
    console.log('✅ Signed PDF saved:', signedFilePath);
    console.log('   Size:', signedPdfBytes.length, 'bytes');
    
    // Update document with signed_file_path
    await prisma.documents.update({
      where: { id: document.id },
      data: { signed_file_path: signedFilePath }
    });
    
    console.log('✅ Document updated with signed_file_path');
    
    // Also save to test-output for easy access
    const testOutputPath = 'test-output/document-015-2025-signed.pdf';
    fs.writeFileSync(testOutputPath, signedPdfBytes);
    console.log('✅ Also saved to:', testOutputPath);
    
    console.log('\n🎉 Done! You can now:');
    console.log('   1. Refresh the Flow page: http://localhost:3000/documents/133/flow');
    console.log('   2. View the signed PDF in test-output folder');
    console.log('   3. Download from the Flow page');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

generateSignedPDF();
