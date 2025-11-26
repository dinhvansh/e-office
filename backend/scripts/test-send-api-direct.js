const axios = require('axios');

async function testSendAPI() {
  try {
    console.log('🔍 Testing Send API Directly...\n');

    // Login first
    console.log('1. Logging in...');
    const loginResponse = await axios.post('http://localhost:4000/api/v1/auth/login', {
      email: 'admin@acme.local',
      password: 'password123'
    });

    const token = loginResponse.data.data.tokens.accessToken;
    console.log('✅ Logged in successfully');
    console.log('');

    // Send sign request
    console.log('2. Sending sign request ID 23...');
    try {
      const sendResponse = await axios.post(
        'http://localhost:4000/api/v1/sign-requests/23/send',
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ SUCCESS!');
      console.log('Response:', JSON.stringify(sendResponse.data, null, 2));
    } catch (sendError) {
      console.log('❌ FAILED!');
      console.log('Status:', sendError.response?.status);
      console.log('Error:', sendError.response?.data);
      console.log('');
      
      if (sendError.response?.data?.error) {
        console.log('🔴 Error Message:', sendError.response.data.error);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testSendAPI();
