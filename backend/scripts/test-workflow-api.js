const fetch = require('node-fetch');

const API_BASE = 'http://localhost:4000/api/v1';

async function testWorkflowAPI() {
  try {
    // Login
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'creator@acme.local',
        password: 'password123'
      })
    });

    const loginData = await loginRes.json();
    const token = loginData.data.tokens.accessToken;
    console.log('✅ Logged in\n');

    // Get workflows list
    const listRes = await fetch(`${API_BASE}/workflows`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const listData = await listRes.json();
    console.log('📋 Workflows:', listData.data.workflows.length);
    
    const firstWorkflow = listData.data.workflows[0];
    console.log('   First workflow ID:', firstWorkflow.id);
    console.log('   Name:', firstWorkflow.name, '\n');

    // Get workflow detail
    const detailRes = await fetch(`${API_BASE}/workflows/${firstWorkflow.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const detailData = await detailRes.json();
    console.log('📄 Workflow Detail:');
    console.log(JSON.stringify(detailData.data.workflow, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testWorkflowAPI();
