const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing if Signer 2 can sign document 030/2025\n');
  
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
  
  if (!doc || !doc.sign_request) {
    console.log('❌ Document or sign request not found');
    return;
  }
  
  const signer2 = doc.sign_request.signers.find(s => s.signing_order === 2);
  
  if (!signer2) {
    console.log('❌ Signer 2 not found');
    return;
  }
  
  console.log(`👤 Signer 2: ${signer2.name}`);
  console.log(`   Email: ${signer2.email}`);
  console.log(`   Status: ${signer2.status}`);
  console.log(`   Order: ${signer2.signing_order}`);
  console.log('');
  
  // Check sequential workflow logic
  console.log('🔍 Sequential Workflow Check:');
  console.log(`   Workflow type: ${doc.sign_request.workflow_type}`);
  
  if (doc.sign_request.workflow_type === 'sequential') {
    const previousSigners = doc.sign_request.signers.filter(s => 
      s.signing_order && s.signing_order < signer2.signing_order
    );
    
    console.log(`   Previous signers: ${previousSigners.length}`);
    
    for (const prev of previousSigners) {
      const icon = prev.status === 'signed' ? '✅' : '❌';
      console.log(`   ${icon} [${prev.signing_order}] ${prev.name} - ${prev.status}`);
    }
    
    const allPreviousSigned = previousSigners.every(s => 
      s.status === 'signed' || s.status === 'completed'
    );
    
    console.log('');
    console.log(`   All previous signed: ${allPreviousSigned ? 'YES ✅' : 'NO ❌'}`);
    
    if (allPreviousSigned) {
      console.log('   ✅ Signer 2 CAN sign now!');
      console.log('');
      console.log('💡 Expected behavior:');
      console.log('   - Signer 2 should see "Chờ ký" status');
      console.log('   - Signer 2 can click to sign');
      console.log('   - After signing, PDF will be regenerated with 2 signatures');
    } else {
      console.log('   ❌ Signer 2 CANNOT sign yet');
      console.log('   Reason: Previous signers have not completed');
    }
  } else {
    console.log('   Parallel workflow - all can sign anytime');
  }
  
  console.log('');
  console.log('📁 Current PDF status:');
  console.log(`   Signed file: ${doc.signed_file_path}`);
  console.log(`   Has watermark: ${doc.signed_file_path?.includes('signing_') ? 'YES (in progress)' : 'NO (completed)'}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
