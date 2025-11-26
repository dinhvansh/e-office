const axios = require('axios');

async function testSend24() {
  try {
    console.log('🔍 Testing Send Sign Request 24...\n');

    // Login
    const loginRes = await axios.post('http://localhost:4000/api/v1/auth/login', {
      email: 'admin@acme.local',
      password: 'password123'
    });
    const token = loginRes.data.data.tokens.accessToken;
    console.log('✅ Logged in\n');

    // Send
    console.log('Sending sign request 24...');
    try {
      const sendRes = await axios.post(
        'http://localhost:4000/api/v1/sign-requests/24/send',
        {},
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      console.log('✅ SUCCESS!');
      console.log('Status:', sendRes.data.data.sign_request.status);
      console.log('');
      console.log('Signers:');
      sendRes.data.data.sign_request.signers.forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.email}`);
        console.log(`     Status: ${s.status}`);
        console.log(`     Has token: ${!!s.signing_token}`);
        console.log(`     Has OTP: ${!!s.otp}`);
      });
    } catch (sendError) {
      console.log('❌ FAILED!');
      console.log('Status:', sendError.response?.status);
      console.log('Error:', JSON.stringify(sendError.response?.data, null, 2));
      
      // Check backend console for detailed error
      console.log('');
      console.log('🔴 Check backend console for detailed error!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testSend24();
