const axios = require('axios');

async function testSaveFields26() {
  try {
    console.log('🔍 Testing Save Fields for Sign Request 26...\n');

    // Login
    const loginRes = await axios.post('http://localhost:4000/api/v1/auth/login', {
      email: 'admin@acme.local',
      password: 'password123'
    });
    const token = loginRes.data.data.tokens.accessToken;
    console.log('✅ Logged in\n');

    // Try to save fields (empty array to test)
    console.log('Saving fields for sign request 26...');
    try {
      const saveRes = await axios.post(
        'http://localhost:4000/api/v1/sign-requests/26/fields',
        { fields: [] },
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      console.log('✅ SUCCESS!');
      console.log('Response:', saveRes.data);
    } catch (saveError) {
      console.log('❌ FAILED!');
      console.log('Status:', saveError.response?.status);
      console.log('Error:', JSON.stringify(saveError.response?.data, null, 2));
      
      if (saveError.response?.status === 500) {
        console.log('');
        console.log('🔴 500 Internal Server Error');
        console.log('   Check backend console for detailed error!');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testSaveFields26();
