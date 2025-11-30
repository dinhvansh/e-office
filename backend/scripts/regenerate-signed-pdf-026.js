const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function regenerate() {
  try {
    console.log('🔍 Finding document 026/2025...\n');

    // Find document
    const document = await prisma.documents.findFirst({
      where: {
        document_number: '026/2025'
      },
      include: {
        sign_request: {
          include: {
            signers: true,
            fields: true
          }
        }
      }
    });

    if (!document) {
      console.log('❌ Document 026/2025 not found');
      return;
    }

    console.log('✅ Found document:', document.id);
    console.log('   Title:', document.title);
    console.log('   Sign Request:', document.sign_request?.id);
    console.log('   Status:', document.sign_request?.status);

    if (!document.sign_request) {
      console.log('❌ No sign request found');
      return;
    }

    // Check signers
    console.log('\n👥 Signers:');
    for (const signer of document.sign_request.signers) {
      console.log(`   ${signer.name}: ${signer.status}`);
      if (signer.position_data) {
        console.log('   position_data:', JSON.stringify(signer.position_data, null, 2));
      }
    }

    // Check fields
    console.log(`\n📝 Fields: ${document.sign_request.fields.length}`);
    for (const field of document.sign_request.fields) {
      console.log(`   Field ${field.id}: ${field.type} at page ${field.page}`);
    }

    // Regenerate PDF
    console.log('\n🔄 Regenerating signed PDF...');
    const { pdfGenerationService } = await import('../src/modules/signRequests/pdfGeneration.service.js');
    
    const signedPdfPath = await pdfGenerationService.generateSignedPdf(document.sign_request.id);
    
    // Update document
    await prisma.documents.update({
      where: { id: document.id },
      data: {
        signed_file_path: signedPdfPath
      }
    });

    console.log('\n✅ Success!');
    console.log('   Signed PDF:', signedPdfPath);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

regenerate();
