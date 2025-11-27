const axios = require('axios');

const API_BASE = 'http://localhost:4000/api/v1';

async function debugWorkflow() {
  // Login
  const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
    email: 'admin@acme.local',
    password: 'password123',
  });
  
  const authToken = loginResponse.data.data.tokens.accessToken;
  console.log('✅ Logged in\n');
  
  // Get workflows
  const workflowsResponse = await axios.get(`${API_BASE}/workflows`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  
  const workflows = workflowsResponse.data.data.workflows || workflowsResponse.data.data;
  console.log(`Found ${workflows.length} workflows\n`);
  
  // Get first workflow detail
  const firstWorkflow = workflows[0];
  console.log(`Getting detail for: ${firstWorkflow.name} (ID: ${firstWorkflow.id})`);
  
  const detailResponse = await axios.get(`${API_BASE}/workflows/${firstWorkflow.id}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  
  console.log('\n📊 Workflow Detail Response:');
  console.log(JSON.stringify(detailResponse.data, null, 2));
}

debugWorkflow().catch(console.error);
