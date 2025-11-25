const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLatestSigner() {
  try {
    // Get latest signer
    const signer = await prisma.signers.findFirst({
      orderBy: { id: 'desc' },
      include: {
        sign_request: {
          include: {
            document: true
          }
        }
      }
    });

    if (!signer) {
      console.log('❌ No signer found');
      return;
    }

    console.log('\n📋 LATEST SIGNER INFO:');
    console.log('════════════════════════════════════════════════════════════');
    console.log('ID:', signer.id);
    console.log('Email:', signer.email);
    console.log('Name:', signer.name);
    console.log('Status:', signer.status);
    console.log('Signing Order:', signer.signing_order);
    console.log('Is Internal:', signer.is_internal);
    console.log('\n🔐 AUTHENTICATION:');
    console.log('Has Token:', signer.signing_token ? 'YES ✅' : 'NO ❌');
    console.log('Token (first 20 chars):', signer.signing_token ? signer.signing_token.substring(0, 20) + '...' : 'N/A');
    console.log('Has OTP:', signer.otp ? 'YES ✅' : 'NO ❌');
    console.log('OTP Expire:', signer.otp_expire ? new Date(signer.otp_expire).toLocaleString('vi-VN') : 'N/A');
    
    console.log('\n📄 DOCUMENT:');
    console.log('Document ID:', signer.sign_request.document_id);
    console.log('Document Title:', signer.sign_request.document.title);
    console.log('Sign Request ID:', signer.sign_request_id);
    console.log('Sign Request Status:', signer.sign_request.status);
    
    console.log('\n🔗 SIGNING URL:');
    const url = `http://localhost:3000/sign/${signer.signing_token}`;
    console.log(url);
    
    console.log('\n✅ Email should have been sent to:', signer.email);
    console.log('════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLatestSigner();
