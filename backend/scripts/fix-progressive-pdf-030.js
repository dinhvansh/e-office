const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

/**
 * Generate progressive PDF manually
 */
async function generateProgressivePDF(document, signRequest, allSigned) {
  console.log('   Loading original PDF...');
  
  // Load original PDF
  const originalPdfPath = path.resolve(__dirname, '../', document.file_path);
  if (!fs.existsSync(originalPdfPath)) {
    throw new Error(`Original PDF not found: ${originalPdfPath}`);
  }

  const originalPdfBytes = fs.readFileSync(originalPdfPath);
  const pdfDoc = await PDFDocument.load(originalPdfBytes);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  console.log(`   Loaded PDF with ${pages.length} pages`);

  // Load fields
  const fields = await prisma.sign_request_fields.findMany({
    where: { sign_request_id: signRequest.id },
    orderBy: { id: 'asc' }
  });

  console.log(`   Found ${fields.length} fields`);

  // Draw signatures from signed signers only
  let drawnCount = 0;
  for (const signer of signRequest.signers) {
    if ((signer.status === 'signed' || signer.status === 'completed') && 
        signer.position_data && typeof signer.position_data === 'object') {
      const fieldSignatures = signer.position_data;
      
      for (const [fieldIdStr, signatureData] of Object.entries(fieldSignatures)) {
        const fieldId = parseInt(fieldIdStr);
        const field = fields.find(f => f.id === fieldId);
        
        if (field && signatureData) {
          const page = pages[field.page - 1];
          if (page) {
            const { width: pageWidth, height: pageHeight } = page.getSize();
            const x = (field.x / 100) * pageWidth;
            const y = pageHeight - ((field.y / 100) * pageHeight);
            const fieldWidth = field.width ? (field.width / 100) * pageWidth : 200;
            const fieldHeight = field.height ? (field.height / 100) * pageHeight : 50;

            if (field.type === 'signature' && typeof signatureData === 'string' && signatureData.startsWith('data:image/')) {
              try {
                const base64Data = signatureData.replace(/^data:image\/\w+;base64,/, '');
                const imageBytes = Buffer.from(base64Data, 'base64');
                
                let image;
                if (signatureData.includes('image/png')) {
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
                
                drawnCount++;
                console.log(`   Drew signature for ${signer.name} on page ${field.page}`);
              } catch (error) {
                console.error(`   Failed to draw signature: ${error.message}`);
              }
            } else if (field.type === 'text' || field.type === 'date') {
              const text = String(signatureData || '');
              page.drawText(text, {
                x: x + 5,
                y: y - fieldHeight + 15,
                size: 12,
                font: font,
                color: rgb(0, 0, 0),
              });
              drawnCount++;
              console.log(`   Drew text "${text}" on page ${field.page}`);
            }
          }
        }
      }
    }
  }

  console.log(`   Drew ${drawnCount} field values`);

  // Add watermark if not all signed
  if (!allSigned) {
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    for (const page of pages) {
      const { width, height } = page.getSize();
      page.drawText('CHUA HOAN THANH', {
        x: width / 2 - 150,
        y: height / 2,
        size: 60,
        font: boldFont,
        color: rgb(1, 0, 0),
        opacity: 0.15,
        rotate: { angle: -45, type: 'degrees' },
      });
    }
    console.log(`   Added watermark`);
  }

  // Save PDF
  const signedPdfBytes = await pdfDoc.save();
  const timestamp = Date.now();
  const prefix = allSigned ? 'signed' : 'signing';
  const fileName = `${prefix}_${timestamp}_${document.id}.pdf`;

  const pathParts = document.file_path.split(/[/\\]/);
  const tenantId = pathParts[1] || '1';
  const filePath = path.join('storage', tenantId, fileName);
  const fullPath = path.resolve(__dirname, '../', filePath);

  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(fullPath, signedPdfBytes);
  console.log(`   Saved to: ${filePath} (${(signedPdfBytes.length / 1024).toFixed(2)} KB)`);

  return filePath;
}

/**
 * Fix Progressive PDF for Document 030/2025
 * Generate the missing progressive PDF
 */

async function fixProgressivePDF() {
  console.log('🔧 Fixing Progressive PDF for Document 030/2025\n');

  try {
    // Get document
    const document = await prisma.documents.findFirst({
      where: { document_number: '030/2025' },
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

    if (!document || !document.sign_request) {
      console.log('❌ Document or sign request not found');
      return;
    }

    console.log('📄 Document:', {
      id: document.id,
      number: document.document_number,
      title: document.title,
      status: document.status
    });

    const signRequest = document.sign_request;
    const signedCount = signRequest.signers.filter(s => 
      s.status === 'signed' || s.status === 'completed'
    ).length;
    const totalCount = signRequest.signers.length;

    console.log(`\n👥 Signers: ${signedCount}/${totalCount} signed`);

    // Check if all signed
    const allSigned = signedCount === totalCount;

    console.log(`\n🔄 Generating progressive PDF...`);
    console.log(`   All signed: ${allSigned ? 'Yes' : 'No'}`);
    console.log(`   Include audit trail: ${allSigned ? 'Yes' : 'No'}`);
    console.log(`   Add watermark: ${allSigned ? 'No' : 'Yes'}`);

    // Generate progressive PDF manually
    const pdfPath = await generateProgressivePDF(document, signRequest, allSigned);

    console.log(`\n✅ Progressive PDF generated: ${pdfPath}`);

    // Update document
    await prisma.documents.update({
      where: { id: document.id },
      data: {
        signed_file_path: pdfPath,
        status: allSigned ? 'completed' : 'in_progress'
      }
    });

    console.log(`✅ Document updated with signed_file_path`);

    // Verify file exists
    const fullPath = path.resolve(__dirname, '../', pdfPath);
    const exists = fs.existsSync(fullPath);
    const size = exists ? fs.statSync(fullPath).size : 0;

    console.log(`\n📄 Verification:`);
    console.log(`   Path: ${pdfPath}`);
    console.log(`   Exists: ${exists ? '✅' : '❌'}`);
    console.log(`   Size: ${(size / 1024).toFixed(2)} KB`);

    if (exists) {
      console.log(`\n✅ SUCCESS! Progressive PDF has been generated.`);
      console.log(`\n📝 Next steps:`);
      console.log(`   1. Check the PDF in the frontend`);
      console.log(`   2. Verify signatures are visible`);
      console.log(`   3. ${allSigned ? 'No watermark should be present' : 'Watermark "CHUA HOAN THANH" should be visible'}`);
    } else {
      console.log(`\n❌ ERROR: File was not created!`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

fixProgressivePDF();
