/**
 * Manually generate signed PDF with enhanced audit trail
 * Usage: node scripts/generate-audit-trail-pdf.js <sign_request_id>
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const signRequestId = parseInt(process.argv[2]);

  if (!signRequestId) {
    console.log('Usage: node scripts/generate-audit-trail-pdf.js <sign_request_id>');
    process.exit(1);
  }

  console.log(`🎨 Generating enhanced audit trail PDF for sign request ${signRequestId}\n`);

  try {
    // Check sign request exists
    const signRequest = await prisma.sign_requests.findUnique({
      where: { id: signRequestId },
      include: {
        document: {
          include: {
            approvals: {
              include: {
                approver: true,
                workflow_step: true
              }
            }
          }
        },
        signers: true
      }
    });

    if (!signRequest) {
      console.log('❌ Sign request not found');
      process.exit(1);
    }

    console.log('📄 Sign Request Info:');
    console.log(`   Document: ${signRequest.document.title}`);
    console.log(`   Status: ${signRequest.status}`);
    console.log(`   Approvals: ${signRequest.document.approvals.length}`);
    console.log(`   Signers: ${signRequest.signers.length}`);
    console.log();

    // Import and run PDF generation
    const { pdfGenerationService } = require('../dist/modules/signRequests/pdfGeneration.service');
    
    console.log('🔄 Generating PDF...');
    const signedPdfPath = await pdfGenerationService.generateSignedPdf(signRequestId);
    
    console.log('✅ PDF generated successfully!');
    console.log(`   Path: ${signedPdfPath}`);
    console.log();

    // Update document
    await prisma.documents.update({
      where: { id: signRequest.document_id },
      data: { signed_file_path: signedPdfPath }
    });

    console.log('✅ Document updated with signed PDF path');
    console.log();

    // Show file info
    const fs = require('fs');
    const path = require('path');
    const fullPath = path.resolve(__dirname, '../../', signedPdfPath);
    
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      console.log('📊 File Info:');
      console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`   Full path: ${fullPath}`);
      console.log();
      console.log('💡 You can open this file to verify the audit trail includes:');
      console.log('   ✓ Approval history with comments');
      console.log('   ✓ Signing history with IP addresses');
      console.log('   ✓ Token info for external signers');
      console.log('   ✓ Internal user authentication labels');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
