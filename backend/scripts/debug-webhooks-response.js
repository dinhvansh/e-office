const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api/v1';

const TEST_USER = {
  email: 'admin@acme.local',
  password: 'admin123'
};

async function debugWebhooksResponse() {
  try {
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    const token = loginResponse.data.data.tokens.accessToken;
    console.log('✅ Login successful\n');

    console.log('📡 Fetching webhooks...');
    const webhooksResponse = await axios.get(`${BASE_URL}/webhooks`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('📦 Full Response:');
    console.log(JSON.stringify(webhooksResponse.data, null, 2));

    console.log('\n📊 Response Structure:');
    console.log('- Has success:', 'success' in webhooksResponse.data);
    console.log('- Has data:', 'data' in webhooksResponse.data);
    console.log('- Type of data:', Array.isArray(webhooksResponse.data.data) ? 'Array' : typeof webhooksResponse.data.data);
    console.log('- Data length:', webhooksResponse.data.data?.length || 0);

    if (webhooksResponse.data.data && webhooksResponse.data.data.length > 0) {
      console.log('\n📝 First webhook:');
      console.log(JSON.stringify(webhooksResponse.data.data[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

debugWebhooksResponse();
