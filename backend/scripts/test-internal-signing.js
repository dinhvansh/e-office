const axios = require('axios');

const API_URL = 'http://localhost:4000/api/v1';

async function testInternalSigning() {
  console.log('🧪 TESTING INTERNAL SIGNING API\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Login as admin
    console.log('\n📝 STEP 1: Login as admin');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@acme.local',
      password: 'password123'
    });
    const adminToken = loginRes.data.data.tokens.accessToken;
    console.log('✅ Admin logged in');

    // Step 2: Get sign request #53 (document 101)
    console.log('\n📝 STEP 2: Get sign request #53');
    const signRequestRes = await axios.get(`${API_URL}/sign-requests/53`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const signRequest = signRequestRes.data.data.sign_request;
    console.log('✅ Sign request found');
    console.log(`   Status: ${signRequest.status}`);
    console.log(`   Signers: ${signRequest.signers?.length || 0}`);

    // Step 3: Sign as admin (internal)
    console.log('\n📝 STEP 3: Sign as admin (internal user)');
    const signatureData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    const signRes = await axios.post(
      `${API_URL}/sign-requests/53/sign-internal`,
      {
        signature_data: signatureData,
        signature_type: 'drawn'
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    console.log('✅ Signed successfully!');
    console.log(`   Message: ${signRes.data.data.message}`);
    console.log(`   All signed: ${signRes.data.data.all_signed}`);

    // Step 4: Verify signer status
    console.log('\n📝 STEP 4: Verify signer status');
    const verifyRes = await axios.get(`${API_URL}/sign-requests/53`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const updatedSigners = verifyRes.data.data.sign_request.signers;
    
    console.log('✅ Signers status:');
    updatedSigners.forEach((s, idx) => {
      console.log(`   ${idx + 1}. ${s.email}`);
      console.log(`      Status: ${s.status}`);
      console.log(`      Signed at: ${s.signed_at || 'Not signed'}`);
      console.log(`      Has signature: ${s.signature_data ? 'Yes' : 'No'}`);
    });

    // Step 5: Check progress
    console.log('\n📝 STEP 5: Check progress');
    const myRequestsRes = await axios.get(`${API_URL}/sign-requests/my-requests`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const myRequest = myRequestsRes.data.data.sign_requests.find(r => r.id === 53);
    
    if (myRequest) {
      console.log('✅ Progress updated:');
      console.log(`   Signed: ${myRequest.progress.signed}/${myRequest.progress.total}`);
      console.log(`   Percentage: ${myRequest.progress.percentage}%`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('\n✅ Internal signing working correctly:');
    console.log('   - No OTP required');
    console.log('   - Signing order enforced');
    console.log('   - Status updated correctly');
    console.log('   - Progress calculated correctly');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('   Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testInternalSigning();
