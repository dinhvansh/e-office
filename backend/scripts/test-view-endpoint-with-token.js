const fetch = require('node-fetch');

async function testViewEndpoint() {
  try {
    // Step 1: Login to get token
    console.log('🔐 Step 1: Login...');
    const loginResponse = await fetch('http://localhost:4000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@acme.local',
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    console.log('   Response:', JSON.stringify(loginData, null, 2));
    
    const token = loginData.data?.tokens?.accessToken;
    if (!token) {
      throw new Error('No token in response');
    }
    console.log('   Token:', token.substring(0, 20) + '...');

    // Step 2: Test view endpoint with token
    console.log('\n📄 Step 2: Test /documents/74/view with token...');
    const viewResponse = await fetch('http://localhost:4000/api/v1/documents/74/view', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('   Status:', viewResponse.status);
    console.log('   Content-Type:', viewResponse.headers.get('content-type'));

    if (viewResponse.ok) {
      console.log('✅ View endpoint works!');
      const buffer = await viewResponse.buffer();
      console.log('   PDF size:', buffer.length, 'bytes');
    } else {
      console.log('❌ View endpoint failed');
      const text = await viewResponse.text();
      console.log('   Error:', text);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testViewEndpoint();
