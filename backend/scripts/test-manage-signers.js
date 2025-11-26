const axios = require('axios');

const API_BASE = 'http://localhost:4000/api/v1';
let authToken = '';

async function login() {
  console.log('\n🔐 Step 1: Login as admin...');
  const response = await axios.post(`${API_BASE}/auth/login`, {
    email: 'admin@acme.local',
    password: 'password123'
  });
  
  authToken = response.data.data.tokens.accessToken;
  console.log('✅ Login successful');
  return authToken;
}

async function createDraftSignRequest() {
  console.log('\n📄 Step 2: Create draft sign request...');
  
  // First create a document
  const docResponse = await axios.post(
    `${API_BASE}/documents`,
    {
      title: 'Test Manage Signers',
      document_type_id: 8, // Báo cáo
      require_digital_signing: true,
      file_base64: 'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvTWVkaWFCb3hbMCAwIDYxMiA3OTJdL1BhcmVudCAyIDAgUi9SZXNvdXJjZXM8PD4+Pj4KZW5kb2JqCnhyZWYKMCA0CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMDY0IDAwMDAwIG4gCjAwMDAwMDAxMTUgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDQvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgoxOTYKJSVFT0YK',
      file_name: 'test-manage-signers.pdf',
      file_type: 'application/pdf',
      signers: [
        {
          email: 'signer1@example.com',
          name: 'Signer 1',
          type: 'manual'
        }
      ]
    },
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  
  const signRequestId = docResponse.data.data.document.sign_request_id;
  console.log(`✅ Sign request created: ID ${signRequestId}`);
  return signRequestId;
}

async function testGetSigners(signRequestId) {
  console.log('\n📋 Step 3: Get current signers...');
  
  const response = await axios.get(
    `${API_BASE}/sign-requests/${signRequestId}/editor`,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  
  const signers = response.data.data.signRequest.signers;
  console.log(`✅ Found ${signers.length} signer(s):`);
  signers.forEach((s, i) => {
    console.log(`   ${i + 1}. ${s.name} (${s.email}) - Order: ${s.signing_order}, Internal: ${s.is_internal}`);
  });
  
  return signers;
}

async function testAddSigner(signRequestId) {
  console.log('\n➕ Step 4: Add new signer...');
  
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
  console.log(`✅ Signer added: ${signer.name} (${signer.email})`);
  console.log(`   Order: ${signer.signing_order}, Internal: ${signer.is_internal}, User ID: ${signer.user_id}`);
  
  return signer;
}

async function testUpdateSigner(signRequestId, signerId) {
  console.log('\n✏️ Step 5: Update signer...');
  
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
  console.log(`✅ Signer updated: ${signer.name}`);
  console.log(`   Role: ${signer.role}`);
  
  return signer;
}

async function testRemoveSigner(signRequestId, signerId) {
  console.log('\n🗑️ Step 6: Remove signer...');
  
  const response = await axios.delete(
    `${API_BASE}/sign-requests/${signRequestId}/signers/${signerId}`,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  
  console.log(`✅ Signer removed successfully`);
  return response.data;
}

async function testCannotEditAfterSend(signRequestId) {
  console.log('\n🔒 Step 7: Test cannot edit after send...');
  
  // First send the sign request
  await axios.post(
    `${API_BASE}/sign-requests/${signRequestId}/send`,
    {},
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  console.log('✅ Sign request sent');
  
  // Try to add signer (should fail)
  try {
    await axios.post(
      `${API_BASE}/sign-requests/${signRequestId}/signers`,
      {
        email: 'test@example.com',
        name: 'Test User'
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    console.log('❌ ERROR: Should not allow adding signer after send');
  } catch (error) {
    if (error.response?.data?.error?.includes('đã được gửi đi')) {
      console.log('✅ Correctly blocked: Cannot add signer after send');
    } else {
      console.log('❌ Wrong error:', error.response?.data?.error);
    }
  }
}

async function testMinimumSigners(signRequestId) {
  console.log('\n⚠️ Step 8: Test minimum signers validation...');
  
  // Get current signers
  const editorData = await axios.get(
    `${API_BASE}/sign-requests/${signRequestId}/editor`,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  
  const signers = editorData.data.data.signRequest.signers;
  
  if (signers.length === 1) {
    // Try to remove the only signer (should fail)
    try {
      await axios.delete(
        `${API_BASE}/sign-requests/${signRequestId}/signers/${signers[0].id}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      console.log('❌ ERROR: Should not allow removing last signer');
    } catch (error) {
      if (error.response?.data?.error?.includes('ít nhất 1 người ký')) {
        console.log('✅ Correctly blocked: Must have at least 1 signer');
      } else {
        console.log('❌ Wrong error:', error.response?.data?.error);
      }
    }
  } else {
    console.log('⏭️ Skipped: More than 1 signer exists');
  }
}

async function runTests() {
  try {
    console.log('🧪 Testing Manage Signers API\n');
    console.log('='.repeat(50));
    
    // Login
    await login();
    
    // Create draft sign request
    const signRequestId = await createDraftSignRequest();
    
    // Get initial signers
    let signers = await testGetSigners(signRequestId);
    
    // Add new signer
    const newSigner = await testAddSigner(signRequestId);
    
    // Get updated signers
    signers = await testGetSigners(signRequestId);
    
    // Update signer
    await testUpdateSigner(signRequestId, newSigner.id);
    
    // Get updated signers again
    signers = await testGetSigners(signRequestId);
    
    // Remove signer
    await testRemoveSigner(signRequestId, newSigner.id);
    
    // Get final signers
    signers = await testGetSigners(signRequestId);
    
    // Test minimum signers validation
    await testMinimumSigners(signRequestId);
    
    // Test cannot edit after send
    await testCannotEditAfterSend(signRequestId);
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 All tests passed!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

runTests();
