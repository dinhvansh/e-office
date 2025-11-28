/**
 * Test My Requests API
 */

const axios = require('axios');

const API_URL = 'http://localhost:4000/api';
const ADMIN_EMAIL = 'admin@acme.local';
const ADMIN_PASSWORD = 'Admin@123';

async function testMyRequests() {
  console.log('\n🔐 Logging in...');
  
  const loginResponse = await axios.post(`${API_URL}/auth/login`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  
  const token = loginResponse.data.data.token;
  console.log('✅ Logged in');
  
  console.log('\n📋 Fetching my sign requests...');
  
  const response = await axios.get(`${API_URL}/sign-requests/my-requests`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  const signRequests = response.data.data.sign_requests;
  
  console.log(`\n✅ Found ${signRequests.length} sign requests\n`);
  
  signRequests.forEach((sr, index) => {
    console.log(`${index + 1}. ${sr.document.document_number || sr.document.title || sr.document.original_file_name}`);
    console.log(`   Sign Request ID: ${sr.id}`);
    console.log(`   Document ID: ${sr.document.id}`);
    console.log(`   Status: ${sr.status}`);
    console.log(`   Progress: ${sr.progress.signed}/${sr.progress.total} (${sr.progress.percentage}%)`);
    console.log(`   Signers: ${sr.signers?.length || 0}`);
    console.log('');
  });
  
  // Check for TEST-MIXED document
  const testMixed = signRequests.find(sr => 
    sr.document.document_number === 'TEST-MIXED-1764229797824'
  );
  
  if (testMixed) {
    console.log('⚠️  Found TEST-MIXED-1764229797824 in results!');
    console.log('   This should NOT be here if it has no sign request');
  } else {
    console.log('✅ TEST-MIXED-1764229797824 not in results (correct)');
  }
}

testMyRequests().catch(error => {
  console.error('❌ Error:', error.message);
  if (error.response) {
    console.error('Response:', error.response.data);
  }
});
