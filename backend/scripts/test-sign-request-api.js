const fetch = require('node-fetch');

const API_BASE = 'http://localhost:4000/api/v1';
const SIGN_REQUEST_ID = 19;

async function testAPIs() {
  // Login first
  console.log('🔐 Logging in...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@acme.local',
      password: 'password123'
    })
  });
  
  const loginData = await loginRes.json();
  if (!loginData.success) {
    console.error('❌ Login failed:', loginData);
    return;
  }
  
  const token = loginData.data.tokens.accessToken;
  console.log('✅ Login success, token:', token.substring(0, 20) + '...\n');
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  // Test 1: Get editor data
  console.log(`📋 Test 1: GET /sign-requests/${SIGN_REQUEST_ID}/editor`);
  const editorRes = await fetch(`${API_BASE}/sign-requests/${SIGN_REQUEST_ID}/editor`, { headers });
  console.log('Status:', editorRes.status);
  const editorData = await editorRes.json();
  console.log('Response:', JSON.stringify(editorData, null, 2).substring(0, 200) + '...\n');
  
  // Test 2: Save fields
  console.log(`📋 Test 2: POST /sign-requests/${SIGN_REQUEST_ID}/fields`);
  const fieldsRes = await fetch(`${API_BASE}/sign-requests/${SIGN_REQUEST_ID}/fields`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      fields: [
        {
          type: 'signature',
          page: 1,
          x: 100,
          y: 100,
          width: 200,
          height: 80,
          required: true,
          label: 'Test Signature',
          assigned_signer_id: editorData.data?.signRequest?.signers?.[0]?.id || null
        }
      ]
    })
  });
  console.log('Status:', fieldsRes.status);
  const fieldsData = await fieldsRes.json();
  console.log('Response:', JSON.stringify(fieldsData, null, 2) + '\n');
  
  // Test 3: Send for signing
  console.log(`📋 Test 3: POST /sign-requests/${SIGN_REQUEST_ID}/send`);
  const sendRes = await fetch(`${API_BASE}/sign-requests/${SIGN_REQUEST_ID}/send`, {
    method: 'POST',
    headers
  });
  console.log('Status:', sendRes.status);
  const sendData = await sendRes.json();
  console.log('Response:', JSON.stringify(sendData, null, 2));
  
  console.log('\n✅ All tests completed!');
}

testAPIs().catch(console.error);
