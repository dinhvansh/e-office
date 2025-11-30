import { PrismaClient } from '@prisma/client';
import { pdfGenerationService } from '../src/modules/signRequests/pdfGeneration.service';
import path from 'path';

const prisma = new PrismaClient();

async function regenerate() {
  try {
    console.log('🔄 Regenerating signed PDF for Sign Request #46...\n');

    const signedPdfPath = await pdfGenerationService.generateSignedPdf(46);
    
    // Update document
    const sr = await prisma.sign_requests.findUnique({
      where: { id: 46 },
      select: { document_id: true }
    });

    if (sr) {
      await prisma.documents.update({
        where: { id: sr.document_id },
        data: {
          signed_file_path: signedPdfPath
        }
      });
    }

    console.log('\n✅ Success!');
    console.log('   Signed PDF:', signedPdfPath);
    console.log('\n📄 Full path:', path.resolve(__dirname, '../', signedPdfPath));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

regenerate();
