const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugAddSigner() {
  try {
    console.log('🔍 Debug: Testing add signer logic\n');
    
    // Find a draft sign request
    const signRequest = await prisma.sign_requests.findFirst({
      where: { status: 'draft' },
      include: {
        signers: true
      }
    });
    
    if (!signRequest) {
      console.log('❌ No draft sign request found');
      return;
    }
    
    console.log(`✅ Found sign request: ID ${signRequest.id}`);
    console.log(`   Current signers: ${signRequest.signers.length}`);
    console.log(`   Tenant ID: ${signRequest.tenant_id}\n`);
    
    // Check if email is internal
    const testEmail = 'newsigner@example.com';
    const internalUser = await prisma.users.findFirst({
      where: {
        tenant_id: signRequest.tenant_id,
        email: testEmail,
        status: 'active'
      },
      select: { id: true }
    });
    
    console.log(`🔍 Checking email: ${testEmail}`);
    console.log(`   Is internal: ${!!internalUser}`);
    console.log(`   User ID: ${internalUser?.id || 'null'}\n`);
    
    // Try to create signer
    console.log('➕ Attempting to create signer...');
    
    const signerData = {
      sign_request: { connect: { id: signRequest.id } },
      email: testEmail,
      name: 'Test Signer',
      role: 'Người ký test',
      signing_order: signRequest.signers.length + 1,
      status: 'pending',
      is_internal: !!internalUser,
    };
    
    // Add user relation if internal
    if (internalUser) {
      signerData.user = { connect: { id: internalUser.id } };
    }
    
    console.log('Data to create:', JSON.stringify(signerData, null, 2));
    
    const signer = await prisma.signers.create({
      data: signerData
    });
    
    console.log('\n✅ Signer created successfully!');
    console.log(`   ID: ${signer.id}`);
    console.log(`   Name: ${signer.name}`);
    console.log(`   Email: ${signer.email}`);
    console.log(`   Order: ${signer.signing_order}`);
    console.log(`   Internal: ${signer.is_internal}`);
    console.log(`   User ID: ${signer.user_id}`);
    
    // Clean up - delete the test signer
    await prisma.signers.delete({ where: { id: signer.id } });
    console.log('\n🧹 Test signer deleted (cleanup)');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

debugAddSigner();
