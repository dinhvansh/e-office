const axios = require('axios');

const API_BASE = 'http://localhost:4000/api/v1';
let authToken = '';

async function login() {
  console.log('🔐 Login as admin...');
  const response = await axios.post(`${API_BASE}/auth/login`, {
    email: 'admin@acme.local',
    password: 'password123'
  });
  
  authToken = response.data.data.tokens.accessToken;
  console.log('✅ Login successful\n');
}

async function findDraftSignRequest() {
  console.log('🔍 Finding draft sign request...');
  const response = await axios.get(
    `${API_BASE}/sign-requests/my-requests?status=draft`,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  
  const signRequests = response.data.data.sign_requests;
  if (signRequests.length === 0) {
    throw new Error('No draft sign requests found. Please create one first.');
  }
  
  const signRequest = signRequests[0];
  console.log(`✅ Found draft sign request: ID ${signRequest.id}`);
  console.log(`   Document: ${signRequest.document?.title || 'Untitled'}`);
  console.log(`   Current signers: ${signRequest.signers?.length || 0}\n`);
  
  return signRequest.id;
}

async function testAddSigner(signRequestId) {
  console.log('➕ Test 1: Add new signer...');
  
  try {
    const response = await axios.post(
      `${API_BASE}/sign-requests/${signRequestId}/signers`,
      {
        email: 'newsigner@example.com',
        name: 'New Test Signer',
        role: 'Người ký mới'
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    const signer = response.data.data.signer;
    console.log(`✅ Signer added successfully:`);
    console.log(`   ID: ${signer.id}`);
    console.log(`   Name: ${signer.name}`);
    console.log(`   Email: ${signer.email}`);
    console.log(`   Order: ${signer.signing_order}`);
    console.log(`   Internal: ${signer.is_internal}`);
    console.log(`   User ID: ${signer.user_id}\n`);
    
    return signer.id;
  } catch (error) {
    console.error('❌ Failed to add signer:', error.response?.data || error.message);
    throw error;
  }
}

async function testGetSigners(signRequestId) {
  console.log('📋 Test 2: Get all signers...');
  
  const response = await axios.get(
    `${API_BASE}/sign-requests/${signRequestId}/editor`,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  
  const signers = response.data.data.signRequest.signers;
  console.log(`✅ Found ${signers.length} signer(s):`);
  signers.forEach((s, i) => {
    console.log(`   ${i + 1}. ${s.name} (${s.email})`);
    console.log(`      Order: ${s.signing_order}, Internal: ${s.is_internal}`);
  });
  console.log('');
  
  return signers;
}

async function testUpdateSigner(signRequestId, signerId) {
  console.log('✏️ Test 3: Update signer...');
  
  try {
    const response = await axios.put(
      `${API_BASE}/sign-requests/${signRequestId}/signers/${signerId}`,
      {
        name: 'Updated Signer Name',
        role: 'Updated Role'
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    const signer = response.data.data.signer;
    console.log(`✅ Signer updated:`);
    console.log(`   Name: ${signer.name}`);
    console.log(`   Role: ${signer.role}\n`);
    
    return signer;
  } catch (error) {
    console.error('❌ Failed to update signer:', error.response?.data || error.message);
    throw error;
  }
}

async function testRemoveSigner(signRequestId, signerId) {
  console.log('🗑️ Test 4: Remove signer...');
  
  try {
    await axios.delete(
      `${API_BASE}/sign-requests/${signRequestId}/signers/${signerId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    console.log(`✅ Signer removed successfully\n`);
  } catch (error) {
    console.error('❌ Failed to remove signer:', error.response?.data || error.message);
    throw error;
  }
}

async function testAddInternalSigner(signRequestId) {
  console.log('👤 Test 5: Add internal signer (admin@acme.local)...');
  
  try {
    const response = await axios.post(
      `${API_BASE}/sign-requests/${signRequestId}/signers`,
      {
        email: 'admin@acme.local', // Internal user
        name: 'Admin User'
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    const signer = response.data.data.signer;
    console.log(`✅ Internal signer added:`);
    console.log(`   Name: ${signer.name}`);
    console.log(`   Email: ${signer.email}`);
    console.log(`   Internal: ${signer.is_internal} ✅`);
    console.log(`   User ID: ${signer.user_id} (should not be null)\n`);
    
    return signer.id;
  } catch (error) {
    console.error('❌ Failed to add internal signer:', error.response?.data || error.message);
    throw error;
  }
}

async function runTests() {
  try {
    console.log('🧪 Testing Manage Signers API (Simple)\n');
    console.log('='.repeat(50) + '\n');
    
    // Login
    await login();
    
    // Find existing draft sign request
    const signRequestId = await findDraftSignRequest();
    
    // Test 1: Add external signer
    const externalSignerId = await testAddSigner(signRequestId);
    
    // Test 2: Get all signers
    let signers = await testGetSigners(signRequestId);
    
    // Test 3: Update signer
    await testUpdateSigner(signRequestId, externalSignerId);
    
    // Test 4: Get signers again
    signers = await testGetSigners(signRequestId);
    
    // Test 5: Add internal signer
    const internalSignerId = await testAddInternalSigner(signRequestId);
    
    // Test 6: Get signers again
    signers = await testGetSigners(signRequestId);
    
    // Test 7: Remove external signer
    await testRemoveSigner(signRequestId, externalSignerId);
    
    // Test 8: Get final signers
    signers = await testGetSigners(signRequestId);
    
    console.log('='.repeat(50));
    console.log('🎉 All tests passed!\n');
    console.log('Summary:');
    console.log(`  - Sign Request ID: ${signRequestId}`);
    console.log(`  - Final signers count: ${signers.length}`);
    console.log(`  - Tests completed: 8/8 ✅\n`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

runTests();
