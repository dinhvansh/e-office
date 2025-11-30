const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing Progressive PDF Generation\n');
  
  // Find a sign request with multiple signers
  const signRequest = await prisma.sign_requests.findFirst({
    where: {
      status: { in: ['draft', 'pending', 'in_progress'] }
    },
    include: {
      document: true,
      signers: {
        orderBy: { signing_order: 'asc' }
      }
    }
  });
  
  if (!signRequest) {
    console.log('❌ No sign request found for testing');
    console.log('💡 Create a sign request with multiple signers first');
    return;
  }
  
  console.log(`📄 Sign Request #${signRequest.id}`);
  console.log(`   Document: ${signRequest.document.title || signRequest.document.original_file_name}`);
  console.log(`   Status: ${signRequest.status}`);
  console.log(`   Signers: ${signRequest.signers.length}`);
  console.log('');
  
  // Show signers
  console.log('👥 Signers:');
  for (const signer of signRequest.signers) {
    const statusIcon = signer.status === 'signed' || signer.status === 'completed' ? '✅' : '⏳';
    console.log(`   ${statusIcon} ${signer.name} (${signer.email}) - ${signer.status}`);
  }
  console.log('');
  
  // Check current signed file
  if (signRequest.document.signed_file_path) {
    console.log('📁 Current signed file:');
    console.log(`   ${signRequest.document.signed_file_path}`);
    
    // Check if it has watermark (by filename)
    const hasWatermark = signRequest.document.signed_file_path.includes('signing_');
    const isCompleted = signRequest.document.signed_file_path.includes('signed_');
    
    console.log(`   Watermark: ${hasWatermark ? '✅ Yes (in progress)' : '❌ No (completed)'}`);
    console.log(`   Completed: ${isCompleted ? '✅ Yes' : '❌ No'}`);
  } else {
    console.log('📁 No signed file yet');
  }
  console.log('');
  
  // Test scenarios
  console.log('📋 Test Scenarios:');
  console.log('');
  
  console.log('Scenario 1: First signer signs');
  console.log('  Expected:');
  console.log('  - Generate PDF with 1 signature');
  console.log('  - Add watermark "CHUA HOAN THANH"');
  console.log('  - Save as signing_{timestamp}_{docId}.pdf');
  console.log('  - Update document.signed_file_path');
  console.log('  - Status: in_progress');
  console.log('');
  
  console.log('Scenario 2: Second signer signs');
  console.log('  Expected:');
  console.log('  - Generate PDF with 2 signatures');
  console.log('  - Add watermark "CHUA HOAN THANH"');
  console.log('  - Save as signing_{new_timestamp}_{docId}.pdf');
  console.log('  - Delete old signing_* file');
  console.log('  - Update document.signed_file_path');
  console.log('  - Status: in_progress');
  console.log('');
  
  console.log('Scenario 3: Last signer signs');
  console.log('  Expected:');
  console.log('  - Generate PDF with all signatures');
  console.log('  - NO watermark');
  console.log('  - Add audit trail page');
  console.log('  - Save as signed_{timestamp}_{docId}.pdf');
  console.log('  - Delete old signing_* file');
  console.log('  - Update document.signed_file_path');
  console.log('  - Status: completed');
  console.log('');
  
  console.log('📥 Download Filename Test:');
  console.log('');
  
  const docNumber = signRequest.document.document_number || `DOC-${signRequest.document.id}`;
  const title = (signRequest.document.title || signRequest.document.original_file_name)
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
  
  console.log('In Progress:');
  console.log(`  ${docNumber}_${title}_Draft.pdf`);
  console.log('');
  
  console.log('Completed:');
  console.log(`  ${docNumber}_${title}_Signed.pdf`);
  console.log('');
  
  console.log('Original:');
  console.log(`  ${docNumber}_${title}_Original.pdf`);
  console.log('');
  
  // Implementation checklist
  console.log('✅ Implementation Checklist:');
  console.log('');
  console.log('Backend:');
  console.log('  ✅ pdfGenerationService.generateProgressivePdf()');
  console.log('  ✅ pdfGenerationService.addWatermark()');
  console.log('  ✅ pdfGenerationService.saveProgressivePdf()');
  console.log('  ✅ pdfGenerationService.cleanupOldSigningFiles()');
  console.log('  ✅ signRequestsService.signInternal() - call progressive PDF');
  console.log('  ✅ documentsService.getSignedDocumentFile() - meaningful filename');
  console.log('  ✅ documentsService.getDocumentFile() - meaningful filename');
  console.log('');
  
  console.log('Testing:');
  console.log('  ⏳ Create sign request with 3 signers');
  console.log('  ⏳ Sign as user 1 → Check PDF has watermark');
  console.log('  ⏳ Sign as user 2 → Check PDF has watermark');
  console.log('  ⏳ Sign as user 3 → Check PDF no watermark + audit trail');
  console.log('  ⏳ Download → Check filename format');
  console.log('  ⏳ View → Check watermark display');
  console.log('');
  
  console.log('🎯 Next Steps:');
  console.log('1. Test with real signing flow');
  console.log('2. Verify watermark appears correctly');
  console.log('3. Verify audit trail only on completion');
  console.log('4. Verify old files are cleaned up');
  console.log('5. Verify download filenames are meaningful');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
