import { PrismaClient } from '@prisma/client';
import { pdfGenerationService } from '../src/modules/signRequests/pdfGeneration.service';
import path from 'path';

const prisma = new PrismaClient();

async function regenerate() {
  try {
    console.log('🔍 Regenerating signed PDF for Sign Request #45...\n');

    // Find sign request
    const signRequest = await prisma.sign_requests.findUnique({
      where: { id: 45 },
      include: {
        document: true,
        signers: {
          include: {
            user: true
          }
        },
        fields: true
      }
    });

    if (!signRequest) {
      console.log('❌ Sign Request #45 not found');
      return;
    }

    console.log('✅ Found Sign Request #45');
    console.log('   Document:', signRequest.document.document_number);
    console.log('   Title:', signRequest.document.title);
    console.log('   Status:', signRequest.status);
    console.log('');

    // Check signers
    console.log('👥 Signers:');
    for (const signer of signRequest.signers) {
      const name = signer.user?.full_name || signer.name || signer.email;
      console.log(`   ${name}: ${signer.status}`);
      if (signer.position_data) {
        const posData = typeof signer.position_data === 'string' 
          ? JSON.parse(signer.position_data as string) 
          : signer.position_data;
        console.log('   Has position_data with', Object.keys(posData).length, 'field(s)');
      }
    }
    console.log('');

    // Check fields
    console.log(`📝 Fields: ${signRequest.fields.length}`);
    for (const field of signRequest.fields) {
      console.log(`   Field ${field.id}: ${field.type} at page ${field.page}`);
    }
    console.log('');

    // Regenerate PDF
    console.log('🔄 Regenerating signed PDF...');
    
    const signedPdfPath = await pdfGenerationService.generateSignedPdf(45);
    
    // Update document
    await prisma.documents.update({
      where: { id: signRequest.document_id },
      data: {
        signed_file_path: signedPdfPath
      }
    });

    console.log('\n✅ Success!');
    console.log('   Signed PDF:', signedPdfPath);
    console.log('\n📄 Check the file at:', path.resolve(__dirname, '../', signedPdfPath));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

regenerate();
