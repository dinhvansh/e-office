const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking document 030/2025\n');
  
  // Find document
  const doc = await prisma.documents.findFirst({
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
  
  if (!doc) {
    console.log('❌ Document 030/2025 not found');
    return;
  }
  
  console.log(`📄 Document #${doc.id} (${doc.document_number})`);
  console.log(`   Title: ${doc.title}`);
  console.log(`   Status: ${doc.status}`);
  console.log(`   Original file: ${doc.file_path}`);
  console.log(`   Signed file: ${doc.signed_file_path || 'NONE'}`);
  console.log('');
  
  if (doc.sign_request) {
    console.log(`📝 Sign Request #${doc.sign_request.id}`);
    console.log(`   Status: ${doc.sign_request.status}`);
    console.log(`   Workflow: ${doc.sign_request.workflow_type}`);
    console.log('');
    
    console.log(`👥 Signers (${doc.sign_request.signers.length}):`);
    for (const signer of doc.sign_request.signers) {
      const icon = signer.status === 'signed' ? '✅' : '⏳';
      console.log(`   ${icon} [${signer.signing_order}] ${signer.name}`);
      console.log(`      Email: ${signer.email}`);
      console.log(`      Status: ${signer.status}`);
      console.log(`      Signed at: ${signer.signed_at || 'Not yet'}`);
      console.log(`      Has position_data: ${signer.position_data ? 'YES' : 'NO'}`);
      console.log('');
    }
  }
  
  console.log('\n🔍 Analysis:');
  const signedCount = doc.sign_request?.signers.filter(s => s.status === 'signed').length || 0;
  const totalCount = doc.sign_request?.signers.length || 0;
  
  console.log(`   Signed: ${signedCount}/${totalCount}`);
  console.log(`   Expected: Progressive PDF should be generated`);
  console.log(`   Actual: ${doc.signed_file_path ? 'Has signed file' : 'NO signed file ❌'}`);
  
  if (signedCount > 0 && !doc.signed_file_path) {
    console.log('\n❌ PROBLEM: Progressive PDF generation did NOT run!');
    console.log('   Check backend logs for errors');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
