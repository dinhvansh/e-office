const axios = require('axios');

async function getFreshToken() {
  console.log('🔑 Getting fresh token...');

  try {
    const response = await axios.post(
      'http://localhost:4000/api/v1/auth/login',
      {
        email: 'admin@acme.local',
        password: 'admin123'
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Login successful!');
    console.log('Token:', response.data.data.tokens.accessToken);
    return response.data.data.tokens.accessToken;
  } catch (error) {
    console.error('❌ Login failed!');
    console.error('Status:', error.response?.status);
    console.error('Error data:', JSON.stringify(error.response?.data, null, 2));
    throw error;
  }
}

async function sendSignRequest(token) {
  const signRequestId = 1;

  console.log(`📤 Sending sign request ${signRequestId}...`);

  try {
    const response = await axios.post(
      `http://localhost:4000/api/v1/sign-requests/${signRequestId}/send`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('✅ Send successful!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Send failed!');
    console.error('Status:', error.response?.status);
    console.error('Error data:', JSON.stringify(error.response?.data, null, 2));
  }
}

async function main() {
  try {
    const token = await getFreshToken();
    await sendSignRequest(token);
  } catch (error) {
    console.error('Script failed:', error.message);
  }
}

main();