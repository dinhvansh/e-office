const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetSignRequest23() {
  try {
    console.log('🔄 Resetting Sign Request 23 to Draft...\n');

    // Reset sign request status
    await prisma.sign_requests.update({
      where: { id: 23 },
      data: { status: 'draft' }
    });
    console.log('✅ Sign request 23 → draft');

    // Reset all signers
    await prisma.signers.updateMany({
      where: { sign_request_id: 23 },
      data: {
        status: 'pending',
        signing_token: null,
        otp: null,
        otp_expire: null,
        signed_at: null,
        signature_data: null
      }
    });
    console.log('✅ All signers reset to pending');

    // Reset document status
    await prisma.documents.update({
      where: { id: 55 },
      data: { status: 'draft' }
    });
    console.log('✅ Document 55 → draft');

    console.log('');
    console.log('🎯 Now you can test "Gửi đi ký" again!');
    console.log('   URL: http://localhost:3000/sign-requests/23/editor');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetSignRequest23();
