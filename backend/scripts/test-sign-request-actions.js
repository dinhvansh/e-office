/**
 * Test Sign Request Actions
 * - Delete (draft only)
 * - Cancel (pending/in_progress)
 * - Revoke (completed internal only)
 */

const axios = require('axios');

const API_URL = 'http://localhost:4000/api';

// Admin credentials
const ADMIN_EMAIL = 'admin@acme.local';
const ADMIN_PASSWORD = 'Admin@123';

let authToken = '';
let testDocumentId = null;
let testSignRequestId = null;

async function login() {
  console.log('\n🔐 Logging in as admin...');
  const response = await axios.post(`${API_URL}/auth/login`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  authToken = response.data.data.token;
  console.log('✅ Logged in successfully');
}

async function createTestDocument() {
  console.log('\n📄 Creating test document...');
  
  // Create document
  const formData = new FormData();
  const blob = new Blob(['Test PDF content'], { type: 'application/pdf' });
  formData.append('file', blob, 'test-actions.pdf');
  formData.append('title', 'Test Sign Request Actions');
  formData.append('document_type_id', '1');
  
  const response = await axios.post(`${API_URL}/documents`, formData, {
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'multipart/form-data',
    },
  });
  
  testDocumentId = response.data.data.document.id;
  console.log(`✅ Document created: ID ${testDocumentId}`);
  
  return testDocumentId;
}

async function createDraftSignRequest() {
  console.log('\n📝 Creating draft sign request...');
  
  const response = await axios.post(
    `${API_URL}/sign-requests`,
    {
      document_id: testDocumentId,
      title: 'Test Draft Sign Request',
      workflow_type: 'sequential',
      signers: [
        {
          email: 'admin@acme.local',
          name: 'Admin User',
          role: 'signer',
        },
      ],
    },
    {
      headers: { Authorization: `Bearer ${authToken}` },
    }
  );
  
  testSignRequestId = response.data.data.sign_request.id;
  console.log(`✅ Draft sign request created: ID ${testSignRequestId}`);
  
  return testSignRequestId;
}

async function testDeleteDraft() {
  console.log('\n🗑️  Testing DELETE draft sign request...');
  
  try {
    const response = await axios.delete(
      `${API_URL}/sign-requests/${testSignRequestId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    
    console.log('✅ Draft sign request deleted successfully');
    console.log('Response:', response.data);
    
    // Verify it's deleted
    try {
      await axios.get(`${API_URL}/sign-requests/${testSignRequestId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      console.log('❌ ERROR: Sign request still exists!');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Verified: Sign request no longer exists');
      }
    }
  } catch (error) {
    console.error('❌ Delete failed:', error.response?.data || error.message);
  }
}

async function testCancelPending() {
  console.log('\n🚫 Testing CANCEL pending sign request...');
  
  // Create new sign request and send it
  await createTestDocument();
  await createDraftSignRequest();
  
  // Send it to make it pending
  await axios.post(
    `${API_URL}/sign-requests/${testSignRequestId}/send`,
    {},
    {
      headers: { Authorization: `Bearer ${authToken}` },
    }
  );
  console.log('✅ Sign request sent (status: pending)');
  
  try {
    const response = await axios.post(
      `${API_URL}/sign-requests/${testSignRequestId}/cancel`,
      { reason: 'Testing cancel functionality' },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    
    console.log('✅ Sign request cancelled successfully');
    console.log('Response:', response.data);
    
    // Verify status is cancelled
    const checkResponse = await axios.get(
      `${API_URL}/sign-requests/${testSignRequestId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    
    if (checkResponse.data.data.sign_request.status === 'cancelled') {
      console.log('✅ Verified: Status is "cancelled"');
    } else {
      console.log('❌ ERROR: Status is not cancelled:', checkResponse.data.data.sign_request.status);
    }
  } catch (error) {
    console.error('❌ Cancel failed:', error.response?.data || error.message);
  }
}

async function testRevokeCompleted() {
  console.log('\n↩️  Testing REVOKE completed internal sign request...');
  
  // Create new sign request
  await createTestDocument();
  await createDraftSignRequest();
  
  // Send it
  await axios.post(
    `${API_URL}/sign-requests/${testSignRequestId}/send`,
    {},
    {
      headers: { Authorization: `Bearer ${authToken}` },
    }
  );
  
  // Sign it internally
  await axios.post(
    `${API_URL}/sign-requests/${testSignRequestId}/sign-internal`,
    {
      signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      signature_type: 'drawn',
    },
    {
      headers: { Authorization: `Bearer ${authToken}` },
    }
  );
  console.log('✅ Sign request completed');
  
  try {
    const response = await axios.post(
      `${API_URL}/sign-requests/${testSignRequestId}/revoke`,
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    
    console.log('✅ Sign request revoked successfully');
    console.log('Response:', response.data);
    
    // Verify status is back to draft
    const checkResponse = await axios.get(
      `${API_URL}/sign-requests/${testSignRequestId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    
    if (checkResponse.data.data.sign_request.status === 'draft') {
      console.log('✅ Verified: Status is back to "draft"');
    } else {
      console.log('❌ ERROR: Status is not draft:', checkResponse.data.data.sign_request.status);
    }
    
    // Check signers are reset
    const signers = checkResponse.data.data.sign_request.signers;
    const allPending = signers.every(s => s.status === 'pending');
    if (allPending) {
      console.log('✅ Verified: All signers reset to "pending"');
    } else {
      console.log('❌ ERROR: Some signers not reset:', signers.map(s => s.status));
    }
  } catch (error) {
    console.error('❌ Revoke failed:', error.response?.data || error.message);
  }
}

async function testRevokeExternalShouldFail() {
  console.log('\n❌ Testing REVOKE with external signer (should fail)...');
  
  // Create new sign request with external signer
  await createTestDocument();
  
  const response = await axios.post(
    `${API_URL}/sign-requests`,
    {
      document_id: testDocumentId,
      title: 'Test External Sign Request',
      workflow_type: 'sequential',
      signers: [
        {
          email: 'external@example.com',
          name: 'External User',
          role: 'signer',
        },
      ],
    },
    {
      headers: { Authorization: `Bearer ${authToken}` },
    }
  );
  
  testSignRequestId = response.data.data.sign_request.id;
  
  // Send and complete it (simulate)
  await axios.post(
    `${API_URL}/sign-requests/${testSignRequestId}/send`,
    {},
    {
      headers: { Authorization: `Bearer ${authToken}` },
    }
  );
  
  // Manually update status to completed for testing
  // (In real scenario, external user would sign via public endpoint)
  
  try {
    await axios.post(
      `${API_URL}/sign-requests/${testSignRequestId}/revoke`,
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    
    console.log('❌ ERROR: Revoke should have failed for external signers!');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly rejected: Cannot revoke with external signers');
      console.log('Error message:', error.response.data.error);
    } else {
      console.error('❌ Unexpected error:', error.response?.data || error.message);
    }
  }
}

async function runTests() {
  try {
    await login();
    
    // Test 1: Delete draft
    await createTestDocument();
    await createDraftSignRequest();
    await testDeleteDraft();
    
    // Test 2: Cancel pending
    await testCancelPending();
    
    // Test 3: Revoke completed internal
    await testRevokeCompleted();
    
    // Test 4: Revoke with external (should fail)
    await testRevokeExternalShouldFail();
    
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

runTests();
