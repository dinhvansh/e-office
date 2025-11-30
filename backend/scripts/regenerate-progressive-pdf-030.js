const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Regenerate Progressive PDF for Document 030
 */

async function regenerateProgressivePDF() {
  console.log('🔄 Regenerating Progressive PDF for Document 030\n');

  try {
    // Get document
    const document = await prisma.documents.findFirst({
      where: { document_number: '030/2025' }
    });

    if (!document) {
      console.log('❌ Document not found');
      return;
    }

    const signRequest = await prisma.sign_requests.findFirst({
      where: { document_id: document.id }
    });

    if (!signRequest) {
      console.log('❌ Sign request not found');
      return;
    }

    console.log('📄 Document:', document.document_number);
    console.log('📝 Sign Request ID:', signRequest.id);
    console.log('');

    // Import PDF generation service
    const path = require('path');
    const pdfGenPath = path.resolve(__dirname, '../src/modules/signRequests/pdfGeneration.service.ts');
    
    // Use dynamic import for TypeScript
    console.log('📦 Loading PDF generation service...');
    const { pdfGenerationService } = await import('file://' + pdfGenPath.replace(/\\/g, '/'));

    // Check if all signed
    const signers = await prisma.signers.findMany({
      where: { sign_request_id: signRequest.id },
      orderBy: { signing_order: 'asc' }
    });

    const allSigned = signers.every(s => s.status === 'signed' || s.status === 'completed');
    const signedCount = signers.filter(s => s.status === 'signed' || s.status === 'completed').length;

    console.log(`👥 Signers: ${signedCount}/${signers.length} signed`);
    console.log(`📊 All signed: ${allSigned ? 'Yes' : 'No'}`);
    console.log('');

    // Generate progressive PDF
    console.log('🔄 Generating progressive PDF...\n');
    
    const pdfPath = await pdfGenerationService.generateProgressivePdf(
      signRequest.id,
      {
        includeAuditTrail: allSigned,  // Only add audit trail when completed
        addWatermark: !allSigned        // Add watermark if not completed
      }
    );

    console.log('\n✅ Progressive PDF generated successfully!');
    console.log(`📄 Path: ${pdfPath}`);

    // Update document
    await prisma.documents.update({
      where: { id: document.id },
      data: {
        signed_file_path: pdfPath,
        status: allSigned ? 'completed' : 'in_progress'
      }
    });

    console.log('✅ Document updated');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

regenerateProgressivePDF();
