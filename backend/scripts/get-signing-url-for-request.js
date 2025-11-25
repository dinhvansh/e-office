const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Change this to your sign request ID
const SIGN_REQUEST_ID = 47;

async function getSigningUrl() {
  console.log('\n🔗 GET SIGNING URL');
  console.log('='.repeat(60));
  console.log(`📝 Sign Request ID: ${SIGN_REQUEST_ID}`);
  
  try {
    // Get sign request with signers
    const signRequest = await prisma.sign_requests.findUnique({
      where: { id: SIGN_REQUEST_ID },
      include: {
        signers: true,
        document: true,
        fields: true
      }
    });

    if (!signRequest) {
      console.error('❌ Sign request not found');
      return;
    }

    console.log('\n📋 Sign Request Info:');
    console.log(`   Status: ${signRequest.status}`);
    console.log(`   Document: ${signRequest.document.title}`);
    console.log(`   Signers: ${signRequest.signers.length}`);
    console.log(`   Fields: ${signRequest.fields.length}`);

    console.log('\n👥 Signers:');
    for (const signer of signRequest.signers) {
      console.log(`\n   Signer #${signer.id}:`);
      console.log(`   - Email: ${signer.email}`);
      console.log(`   - Name: ${signer.name}`);
      console.log(`   - Status: ${signer.status}`);
      console.log(`   - Has Token: ${signer.signing_token ? 'Yes' : 'No'}`);
      console.log(`   - Has OTP: ${signer.otp ? 'Yes' : 'No'}`);
      
      if (signer.signing_token) {
        const signingUrl = `http://localhost:3000/sign/${signer.signing_token}`;
        console.log(`   - URL: ${signingUrl}`);
      } else {
        console.log(`   - URL: ⚠️ No token yet - need to send sign request first`);
      }
    }

    console.log('\n📄 Fields:');
    for (const field of signRequest.fields) {
      console.log(`   - Field #${field.id}: ${field.type} (${field.x}%, ${field.y}%, ${field.width}x${field.height})`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('💡 Next Steps:');
    console.log('='.repeat(60));
    
    if (signRequest.status === 'draft') {
      console.log('\n⚠️  Sign request is in DRAFT status');
      console.log('   Run: node scripts/resend-sign-request.js');
      console.log('   This will send email with URL + OTP');
    } else if (signRequest.signers[0]?.signing_token) {
      console.log('\n✅ Ready to sign!');
      console.log(`   URL: http://localhost:3000/sign/${signRequest.signers[0].signing_token}`);
      console.log('\n📧 Check email for OTP code');
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

getSigningUrl();
