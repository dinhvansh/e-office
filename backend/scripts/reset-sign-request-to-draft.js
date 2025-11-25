const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Change this to the sign request ID you want to reset
const SIGN_REQUEST_ID = 47; // Change this if needed

async function resetSignRequest() {
  console.log('\n🔄 RESET SIGN REQUEST TO DRAFT');
  console.log('='.repeat(60));
  console.log(`📝 Sign Request ID: ${SIGN_REQUEST_ID}`);
  
  try {
    // Step 1: Get sign request info
    const signRequest = await prisma.sign_requests.findUnique({
      where: { id: SIGN_REQUEST_ID },
      include: {
        signers: true,
        document: true
      }
    });

    if (!signRequest) {
      console.error('❌ Sign request not found');
      return;
    }

    console.log('\n📋 Current Status:');
    console.log(`   Sign Request: ${signRequest.status}`);
    console.log(`   Document: ${signRequest.document.status}`);
    console.log(`   Signers: ${signRequest.signers.length}`);

    // Step 2: Reset signers to pending
    console.log('\n🔄 Resetting signers...');
    for (const signer of signRequest.signers) {
      await prisma.signers.update({
        where: { id: signer.id },
        data: {
          status: 'pending',
          signature_data: null,
          signature_type: null,
          signed_at: null,
          ip_address: null,
          user_agent: null,
          // Keep signing_token and otp for reuse
        }
      });
      console.log(`   ✅ Reset signer ${signer.id}: ${signer.email}`);
    }

    // Step 3: Reset sign request to draft
    console.log('\n🔄 Resetting sign request...');
    await prisma.sign_requests.update({
      where: { id: SIGN_REQUEST_ID },
      data: {
        status: 'draft',
      }
    });
    console.log('   ✅ Sign request reset to draft');

    // Step 4: Reset document status
    console.log('\n🔄 Resetting document...');
    await prisma.documents.update({
      where: { id: signRequest.document_id },
      data: {
        status: 'draft',
      }
    });
    console.log('   ✅ Document reset to draft');

    // Step 5: Clear field values
    console.log('\n🔄 Clearing field values...');
    const deletedValues = await prisma.sign_request_field_values.deleteMany({
      where: {
        field: {
          sign_request_id: SIGN_REQUEST_ID
        }
      }
    });
    console.log(`   ✅ Cleared ${deletedValues.count} field values`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ RESET COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n💡 You can now:');
    console.log('   1. Send sign request again');
    console.log('   2. Get new OTP');
    console.log('   3. Sign the document again');
    console.log('\n🔗 Signing URL (same token):');
    console.log(`   http://localhost:3000/sign/${signRequest.signers[0].signing_token}`);
    console.log('\n📧 To send again:');
    console.log(`   POST /api/v1/sign-requests/${SIGN_REQUEST_ID}/send`);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

resetSignRequest();
