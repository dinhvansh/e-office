const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Import pdfSigningService
async function generateSignedPdfForDocument133() {
  console.log('\n📄 Generating Signed PDF for Document 133...\n');
  
  try {
    // Get document
    const document = await prisma.documents.findUnique({
      where: { id: 133 },
      include: {
        sign_request: true
      }
    });

    if (!document) {
      console.log('❌ Document 133 not found');
      return;
    }

    if (!document.sign_request) {
      console.log('❌ No sign request found for document 133');
      return;
    }

    console.log('📋 Document:', document.title);
    console.log('📋 Sign Request ID:', document.sign_request.id);
    console.log('📋 Status:', document.status);

    // Dynamically import the service
    const { pdfSigningService } = require('../src/modules/public/pdfSigning.service.ts');
    
    console.log('\n🔄 Generating signed PDF...');
    const signedPdfBuffer = await pdfSigningService.generateSignedPdf(document.sign_request.id);
    
    console.log('✅ PDF generated, size:', signedPdfBuffer.length, 'bytes');

    // Save to storage
    const signedFileName = `signed_${Date.now()}_${document.id}.pdf`;
    const tenantId = document.file_path.split('/')[1] || document.file_path.split('\\')[1];
    const signedFilePath = path.join('storage', tenantId, signedFileName);
    
    // Ensure directory exists
    const signedDir = path.dirname(signedFilePath);
    if (!fs.existsSync(signedDir)) {
      fs.mkdirSync(signedDir, { recursive: true });
      console.log('📁 Created directory:', signedDir);
    }
    
    // Write file
    fs.writeFileSync(signedFilePath, signedPdfBuffer);
    console.log('💾 Saved to:', signedFilePath);
    
    // Update document
    await prisma.documents.update({
      where: { id: 133 },
      data: { signed_file_path: signedFilePath }
    });
    
    console.log('✅ Document updated with signed_file_path');
    console.log('\n🎉 Done! You can now view/download the signed PDF.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

generateSignedPdfForDocument133();
