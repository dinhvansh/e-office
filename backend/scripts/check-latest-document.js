const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLatestDocument() {
  console.log('\n🔍 CHECK LATEST DOCUMENT');
  console.log('='.repeat(60));
  
  try {
    // Get latest document with sign request
    const latestDoc = await prisma.documents.findFirst({
      where: {
        sign_request_id: { not: null }
      },
      orderBy: { id: 'desc' },
      include: {
        sign_request: {
          include: {
            signers: true,
            fields: true
          }
        }
      }
    });

    if (!latestDoc) {
      console.log('❌ No documents with sign requests found');
      return;
    }

    console.log('\n📄 Document Info:');
    console.log(`   ID: ${latestDoc.id}`);
    console.log(`   Title: ${latestDoc.title}`);
    console.log(`   Status: ${latestDoc.status}`);

    const signRequest = latestDoc.sign_requests;
    console.log('\n📝 Sign Request Info:');
    console.log(`   ID: ${signRequest.id}`);
    console.log(`   Status: ${signRequest.status}`);

    console.log('\n👥 Signers:');
    for (const signer of signRequest.signers) {
      console.log(`\n   Signer #${signer.id}:`);
      console.log(`   - Email: ${signer.email}`);
      console.log(`   - Name: ${signer.name}`);
      console.log(`   - Status: ${signer.status}`);
      console.log(`   - Has Token: ${signer.signing_token ? 'Yes' : 'No'}`);
      
      if (signer.signing_token) {
        console.log(`   - URL: http://localhost:3000/sign/${signer.signing_token}`);
      }
    }

    console.log('\n📋 Fields:');
    if (signRequest.fields.length === 0) {
      console.log('   ⚠️  NO FIELDS FOUND!');
      console.log('   This is why signer cannot see fields.');
      console.log('\n💡 Solution:');
      console.log('   1. Go to editor page');
      console.log('   2. Add signature fields');
      console.log('   3. Click "Lưu" to save');
    } else {
      for (const field of signRequest.fields) {
        console.log(`\n   Field #${field.id}:`);
        console.log(`   - Type: ${field.type}`);
        console.log(`   - Position: ${field.x}%, ${field.y}%`);
        console.log(`   - Size: ${field.width}x${field.height}`);
        console.log(`   - Assigned to signer: ${field.assigned_signer_id || 'None'}`);
        console.log(`   - Required: ${field.required}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('💡 Next Steps:');
    console.log('='.repeat(60));
    
    if (signRequest.fields.length === 0) {
      console.log('\n⚠️  Add fields first!');
      console.log(`   1. Go to: http://localhost:3000/sign-requests/${signRequest.id}/editor`);
      console.log('   2. Click on PDF to add signature fields');
      console.log('   3. Click "Lưu" to save');
      console.log('   4. Then send sign request');
    } else {
      console.log('\n✅ Fields exist!');
      console.log('   Check if they are assigned to correct signer');
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkLatestDocument();
