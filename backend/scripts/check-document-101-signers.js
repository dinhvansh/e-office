const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSigners() {
  console.log('🔍 CHECKING DOCUMENT #101 SIGNERS\n');
  
  const signRequest = await prisma.sign_requests.findFirst({
    where: {
      document_id: 101
    },
    include: {
      signers: {
        orderBy: { signing_order: 'asc' }
      }
    }
  });

  if (!signRequest) {
    console.log('❌ Sign request not found');
    return;
  }

  console.log('📋 SIGN REQUEST:');
  console.log(`   ID: ${signRequest.id}`);
  console.log(`   Status: ${signRequest.status}`);
  console.log(`   Workflow Type: ${signRequest.workflow_type}`);

  console.log('\n✍️  SIGNERS:');
  signRequest.signers.forEach((signer, idx) => {
    console.log(`\n   ${idx + 1}. ${signer.email}`);
    console.log(`      ID: ${signer.id}`);
    console.log(`      Name: ${signer.name || 'N/A'}`);
    console.log(`      Order: ${signer.signing_order}`);
    console.log(`      Status: ${signer.status}`);
    console.log(`      Is Internal: ${signer.is_internal}`);
    console.log(`      Has Token: ${signer.signing_token ? 'Yes' : 'No'}`);
    console.log(`      Has Signature: ${signer.signature_data ? 'Yes' : 'No'}`);
    console.log(`      Signed At: ${signer.signed_at || 'Not signed'}`);
  });

  console.log('\n📊 PROGRESS:');
  const total = signRequest.signers.length;
  const signed = signRequest.signers.filter(s => 
    s.status === 'signed' || s.status === 'completed'
  ).length;
  const pending = total - signed;
  
  console.log(`   Total: ${total}`);
  console.log(`   Signed: ${signed}`);
  console.log(`   Pending: ${pending}`);
  console.log(`   Progress: ${signed}/${total} (${Math.round((signed/total)*100)}%)`);

  if (signed === 0) {
    console.log('\n⚠️  WARNING: No signers have signed yet!');
    console.log('   All signers have status "otp_sent" but no signatures.');
    console.log('   This means:');
    console.log('   1. Workflow completed ✅');
    console.log('   2. But signers have not actually signed the document yet ❌');
    console.log('   3. They need to open the signing link and complete signing');
  }
}

checkSigners()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
