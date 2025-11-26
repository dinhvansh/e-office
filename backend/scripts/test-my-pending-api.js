const axios = require('axios');

async function testMyPendingAPI() {
  try {
    console.log('🔍 Testing /approvals/my-pending API...\n');

    // Login as admin
    const loginRes = await axios.post('http://localhost:4000/api/v1/auth/login', {
      email: 'admin@acme.local',
      password: 'password123'
    });

    const token = loginRes.data.data.tokens.accessToken;
    console.log('✅ Logged in as admin');

    // Get my pending approvals
    const approvalsRes = await axios.get('http://localhost:4000/api/v1/approvals/my-pending', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`\n📊 Response status: ${approvalsRes.status}`);
    console.log(`📊 Response data type: ${Array.isArray(approvalsRes.data) ? 'Array' : typeof approvalsRes.data}`);
    
    if (Array.isArray(approvalsRes.data)) {
      console.log(`📊 Total approvals: ${approvalsRes.data.length}`);
      
      if (approvalsRes.data.length > 0) {
        console.log('\n📋 First approval:');
        const first = approvalsRes.data[0];
        console.log(JSON.stringify(first, null, 2));
      }
    } else {
      console.log('\n📋 Response data:');
      console.log(JSON.stringify(approvalsRes.data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testMyPendingAPI();
