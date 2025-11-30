const fetch = require('node-fetch');

async function testExternalOrgsAPI() {
  try {
    // First login to get token
    const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@acme.local',
        password: 'admin123',
      }),
    });

    const loginData = await loginRes.json();
    console.log('Login response:', JSON.stringify(loginData, null, 2));

    const token = loginData.data?.tokens?.accessToken || loginData.token;
    if (!token) {
      console.error('❌ No token received');
      return;
    }

    console.log('✅ Token received');

    // Test external-orgs with pagination
    console.log('\n📋 Testing /external-orgs with pagination...');
    const orgsRes = await fetch('http://localhost:4000/api/v1/external-orgs?page=1&limit=10', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const orgsData = await orgsRes.json();
    console.log('External orgs response:', JSON.stringify(orgsData, null, 2));

    // Check structure
    if (orgsData.data && orgsData.pagination) {
      console.log('✅ Response structure is correct!');
      console.log(`   - Data count: ${orgsData.data.length}`);
      console.log(`   - Total: ${orgsData.pagination.total}`);
      console.log(`   - Page: ${orgsData.pagination.page}/${orgsData.pagination.totalPages}`);
    } else {
      console.log('❌ Response structure is wrong!');
      console.log('   Expected: { data: [...], pagination: {...} }');
      console.log('   Got:', Object.keys(orgsData));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testExternalOrgsAPI();
