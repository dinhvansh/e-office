const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSigners() {
  console.log('🔧 FIXING DOCUMENT #101 SIGNERS TO INTERNAL\n');
  
  // Get sign request
  const signRequest = await prisma.sign_requests.findFirst({
    where: { document_id: 101 },
    include: {
      signers: true
    }
  });

  if (!signRequest) {
    console.log('❌ Sign request not found');
    return;
  }

  console.log('📋 Sign Request ID:', signRequest.id);
  console.log('   Signers:', signRequest.signers.length);

  // Update each signer
  for (const signer of signRequest.signers) {
    console.log(`\n🔄 Processing: ${signer.email}`);
    console.log(`   Current is_internal: ${signer.is_internal}`);

    // Check if user exists
    const user = await prisma.users.findFirst({
      where: {
        email: signer.email,
        status: 'active'
      }
    });

    if (user) {
      console.log(`   ✅ Found internal user (ID: ${user.id})`);
      
      // Update signer
      await prisma.signers.update({
        where: { id: signer.id },
        data: {
          is_internal: true
        }
      });
      
      console.log(`   ✅ Updated to is_internal: true`);
    } else {
      console.log(`   ⚠️  No internal user found - keeping as external`);
    }
  }

  // Verify updates
  console.log('\n📊 VERIFICATION:');
  const updated = await prisma.signers.findMany({
    where: { sign_request_id: signRequest.id }
  });

  updated.forEach((s, idx) => {
    console.log(`   ${idx + 1}. ${s.email}`);
    console.log(`      is_internal: ${s.is_internal}`);
    console.log(`      status: ${s.status}`);
  });

  console.log('\n✅ Done!');
  console.log('\n💡 Next steps:');
  console.log('   1. Internal signers should sign in dashboard (no OTP)');
  console.log('   2. External signers use public link + OTP');
}

fixSigners()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
