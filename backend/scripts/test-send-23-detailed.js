const axios = require('axios');

async function testSend23() {
  try {
    console.log('🔍 Testing Send Sign Request 23 (Detailed)...\n');

    // Login
    console.log('1. Login as admin...');
    const loginRes = await axios.post('http://localhost:4000/api/v1/auth/login', {
      email: 'admin@acme.local',
      password: 'password123'
    });
    const token = loginRes.data.data.tokens.accessToken;
    console.log('✅ Logged in\n');

    // Get sign request before send
    console.log('2. Get sign request 23 BEFORE send...');
    const beforeRes = await axios.get('http://localhost:4000/api/v1/sign-requests/23', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Status BEFORE:', beforeRes.data.data.sign_request.status);
    console.log('Signers BEFORE:', beforeRes.data.data.sign_request.signers.length);
    console.log('');

    // Send
    console.log('3. Sending sign request 23...');
    try {
      const sendRes = await axios.post(
        'http://localhost:4000/api/v1/sign-requests/23/send',
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      console.log('✅ Send SUCCESS!');
      console.log('Status AFTER:', sendRes.data.data.sign_request.status);
      console.log('');
      
      // Check signers
      console.log('4. Checking signers after send...');
      sendRes.data.data.sign_request.signers.forEach((signer, i) => {
        console.log(`Signer ${i + 1}:`);
        console.log('  Email:', signer.email);
        console.log('  Internal:', signer.is_internal);
        console.log('  Status:', signer.status);
        console.log('  Has token:', !!signer.signing_token);
        console.log('  Has OTP:', !!signer.otp);
      });
      
    } catch (sendError) {
      console.log('❌ Send FAILED!');
      console.log('Status:', sendError.response?.status);
      console.log('Error:', JSON.stringify(sendError.response?.data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testSend23();
