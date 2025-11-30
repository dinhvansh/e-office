const fetch = require('node-fetch');

async function testFlowEndpoint() {
  try {
    // Login first
    const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@acme.local',
        password: 'admin123'
      })
    });
    
    const loginData = await loginRes.json();
    console.log('Login response:', JSON.stringify(loginData, null, 2));
    
    if (!loginData.success) {
      throw new Error('Login failed: ' + JSON.stringify(loginData));
    }
    
    const token = loginData.data.tokens.accessToken;
    
    console.log('✅ Logged in successfully\n');
    
    // Test flow endpoint
    const flowRes = await fetch('http://localhost:4000/api/v1/documents/82/flow', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const flowData = await flowRes.json();
    
    console.log('📊 Flow Endpoint Response:');
    console.log('Status:', flowRes.status);
    console.log('\n📄 Document Data:');
    console.log(JSON.stringify(flowData.data.document, null, 2));
    
    console.log('\n🔍 Key Fields:');
    console.log('- signed_file_path:', flowData.data.document.signed_file_path || 'NOT PRESENT ❌');
    console.log('- status:', flowData.data.document.status);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testFlowEndpoint();
