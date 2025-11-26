const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugUpdateSigner() {
  try {
    console.log('🔍 Debug: Testing update signer logic\n');
    
    // Find a signer
    const signer = await prisma.signers.findFirst({
      where: { 
        sign_request: { status: 'draft' }
      },
      include: {
        sign_request: true
      }
    });
    
    if (!signer) {
      console.log('❌ No signer found in draft sign request');
      return;
    }
    
    console.log(`✅ Found signer: ID ${signer.id}`);
    console.log(`   Name: ${signer.name}`);
    console.log(`   Email: ${signer.email}`);
    console.log(`   Role: ${signer.role}`);
    console.log(`   User ID: ${signer.user_id}\n`);
    
    // Try to update signer (simple fields only)
    console.log('➕ Attempting to update signer (name + role)...');
    
    const updated = await prisma.signers.update({
      where: { id: signer.id },
      data: {
        name: 'Updated Name Test',
        role: 'Updated Role Test'
      }
    });
    
    console.log('\n✅ Signer updated successfully!');
    console.log(`   New name: ${updated.name}`);
    console.log(`   New role: ${updated.role}`);
    
    // Restore original values
    await prisma.signers.update({
      where: { id: signer.id },
      data: {
        name: signer.name,
        role: signer.role
      }
    });
    console.log('\n🧹 Original values restored (cleanup)');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

debugUpdateSigner();
