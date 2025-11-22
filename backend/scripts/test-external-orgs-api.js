/**
 * Test External Organizations API
 * Check if API returns data correctly
 */

const API_BASE = 'http://localhost:4000/api/v1';
let token = '';

// Helper: Login
async function login() {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@acme.local',
      password: 'password123',
    }),
  });
  const data = await response.json();
  token = data.data.tokens.accessToken;
  console.log('✅ Logged in successfully\n');
}

// Test: Get external organizations
async function testGetExternalOrgs() {
  console.log('📋 Test: GET /external-orgs');
  console.log('─'.repeat(50));
  
  const response = await fetch(`${API_BASE}/external-orgs`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  console.log('Status:', response.status);
  console.log('Headers:', response.headers.get('content-type'));
  
  const data = await response.json();
  console.log('\n📦 Response data:');
  console.log(JSON.stringify(data, null, 2));
  
  // Check response format
  if (Array.isArray(data)) {
    console.log('\n✅ Response is array');
    console.log(`✅ Found ${data.length} organizations`);
    
    if (data.length > 0) {
      console.log('\n📄 First organization:');
      console.log(JSON.stringify(data[0], null, 2));
    }
  } else if (data.data) {
    console.log('\n✅ Response has .data property');
    const orgs = Array.isArray(data.data) ? data.data : data.data.external_organizations;
    console.log(`✅ Found ${orgs?.length || 0} organizations`);
    
    if (orgs && orgs.length > 0) {
      console.log('\n📄 First organization:');
      console.log(JSON.stringify(orgs[0], null, 2));
    }
  } else {
    console.log('\n❌ Unexpected response format');
  }
  
  return data;
}

// Run tests
async function runTests() {
  console.log('🚀 Testing External Organizations API\n');
  
  try {
    await login();
    await testGetExternalOrgs();
    
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

runTests();
