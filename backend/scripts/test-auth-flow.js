const fetch = require('node-fetch');

const API_BASE = 'http://localhost:4000/api/v1';

async function testAuthFlow() {
  console.log('🔐 Testing Auth Flow...\n');

  try {
    // 1. Login
    console.log('1️⃣ Login with admin@tenant1.local...');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@tenant1.local',
        password: 'password123',
      }),
    });

    const loginData = await loginRes.json();
    
    if (!loginData.success) {
      console.error('❌ Login failed:', loginData.error);
      return;
    }

    console.log('✅ Login successful');
    console.log('   User:', loginData.data.user.email);
    console.log('   Tenant:', loginData.data.tenant.name);
    console.log('   Access Token:', loginData.data.tokens.accessToken.substring(0, 50) + '...');
    console.log('   Refresh Token:', loginData.data.tokens.refreshToken.substring(0, 50) + '...');

    const accessToken = loginData.data.tokens.accessToken;
    const refreshToken = loginData.data.tokens.refreshToken;

    // 2. Test protected endpoint
    console.log('\n2️⃣ Testing protected endpoint (GET /documents)...');
    const docsRes = await fetch(`${API_BASE}/documents`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const docsData = await docsRes.json();
    
    if (!docsData.success) {
      console.error('❌ Documents request failed:', docsData.error);
      return;
    }

    console.log('✅ Documents fetched successfully');
    console.log('   Total documents:', docsData.data.length);

    // 3. Test refresh token
    console.log('\n3️⃣ Testing refresh token...');
    const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    });

    const refreshData = await refreshRes.json();
    
    if (!refreshData.success) {
      console.error('❌ Refresh failed:', refreshData.error);
      return;
    }

    console.log('✅ Token refresh successful');
    console.log('   New Access Token:', refreshData.data.tokens.accessToken.substring(0, 50) + '...');

    // 4. Test with new token
    console.log('\n4️⃣ Testing with new access token...');
    const docsRes2 = await fetch(`${API_BASE}/documents`, {
      headers: {
        'Authorization': `Bearer ${refreshData.data.tokens.accessToken}`,
      },
    });

    const docsData2 = await docsRes2.json();
    
    if (!docsData2.success) {
      console.error('❌ Documents request with new token failed:', docsData2.error);
      return;
    }

    console.log('✅ New token works correctly');

    console.log('\n✅ All auth tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAuthFlow();
