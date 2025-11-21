/**
 * Test 4 Workflow Modes
 * 
 * Mode 1: No Approval (require_approval = false)
 * Mode 2: Strict Workflow (require_approval = true, allow_override = false)
 * Mode 3: Flexible Workflow (require_approval = true, allow_override = true)
 * Mode 4: Ad-hoc Workflow (require_approval = true, default_workflow_id = null)
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:4000/api/v1';
let token = '';

// Helper: Login
async function login() {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@acme.local',
      password: 'password123',
    }),
  });
  const data = await res.json();
  
  if (!res.ok || !data.data?.tokens?.accessToken) {
    console.error('Login failed:', data);
    throw new Error('Login failed');
  }
  
  token = data.data.tokens.accessToken;
  console.log('✅ Logged in as admin@acme.local');
}

// Helper: Create document with base64
async function createDocument(data) {
  const samplePdf = Buffer.from('JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvTWVkaWFCb3hbMCAwIDYxMiA3OTJdL1BhcmVudCAyIDAgUi9SZXNvdXJjZXM8PD4+Pj4KZW5kb2JqCnhyZWYKMCA0CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMDY0IDAwMDAwIG4gCjAwMDAwMDAxMjEgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDQvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgoyMDIKJSVFT0YK', 'base64');
  
  const res = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      file_name: data.file_name || 'test.pdf',
      file_base64: samplePdf.toString('base64'),
      document_type_id: data.document_type_id,
      title: data.title,
      adhoc_steps: data.adhoc_steps,
      customized_steps: data.customized_steps,
    }),
  });
  
  const result = await res.json();
  if (!res.ok) {
    throw new Error(JSON.stringify(result));
  }
  return result.data.document;
}

// Helper: Get document
async function getDocument(id) {
  const res = await fetch(`${API_BASE}/documents/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await res.json();
  return result.data.document;
}

// Test Mode 1: No Approval
async function testMode1() {
  console.log('\n📝 Test Mode 1: No Approval');
  console.log('Document Type: Tài liệu tham khảo (ID: 1)');
  
  const doc = await createDocument({
    file_name: 'reference.pdf',
    document_type_id: 1,
    title: 'Test No Approval',
  });
  
  console.log(`✅ Document created: ID=${doc.id}, Status=${doc.status}`);
  
  if (doc.status === 'active') {
    console.log('✅ PASS: Status is "active" (no approval needed)');
  } else {
    console.log(`❌ FAIL: Expected status "active", got "${doc.status}"`);
  }
}

// Test Mode 2: Strict Workflow
async function testMode2() {
  console.log('\n📝 Test Mode 2: Strict Workflow');
  console.log('Document Type: Hợp đồng (ID: 3)');
  
  const doc = await createDocument({
    file_name: 'contract.pdf',
    document_type_id: 3,
    title: 'Test Strict Workflow',
  });
  
  console.log(`✅ Document created: ID=${doc.id}, Status=${doc.status}`);
  
  if (doc.status === 'pending_approval') {
    console.log('✅ PASS: Status is "pending_approval" (auto-submitted)');
  } else {
    console.log(`❌ FAIL: Expected status "pending_approval", got "${doc.status}"`);
  }
  
  // Check workflow instance
  const res = await fetch(`${API_BASE}/approvals/my-pending`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await res.json();
  
  console.log(`✅ Pending approvals: ${result.data.approvals.length}`);
}

// Test Mode 3: Flexible (Use Default)
async function testMode3Default() {
  console.log('\n📝 Test Mode 3: Flexible Workflow (Use Default)');
  console.log('Document Type: Công văn (ID: 2)');
  
  const doc = await createDocument({
    file_name: 'memo.pdf',
    document_type_id: 2,
    title: 'Test Flexible Default',
  });
  
  console.log(`✅ Document created: ID=${doc.id}, Status=${doc.status}`);
  
  if (doc.status === 'pending_approval') {
    console.log('✅ PASS: Status is "pending_approval" (using default workflow)');
  } else {
    console.log(`❌ FAIL: Expected status "pending_approval", got "${doc.status}"`);
  }
}

// Test Mode 3: Flexible (Customized)
async function testMode3Customized() {
  console.log('\n📝 Test Mode 3: Flexible Workflow (Customized)');
  console.log('Document Type: Công văn (ID: 2)');
  
  const doc = await createDocument({
    file_name: 'memo-custom.pdf',
    document_type_id: 2,
    title: 'Test Flexible Customized',
    customized_steps: [
      {
        approver_type: 'user',
        approver_id: 1,
        due_in_days: 3,
      },
      {
        approver_type: 'user',
        approver_id: 1,
        due_in_days: 5,
      },
    ],
  });
  
  console.log(`✅ Document created: ID=${doc.id}, Status=${doc.status}`);
  
  if (doc.status === 'pending_approval') {
    console.log('✅ PASS: Status is "pending_approval" (customized workflow)');
  } else {
    console.log(`❌ FAIL: Expected status "pending_approval", got "${doc.status}"`);
  }
}

// Test Mode 4: Ad-hoc
async function testMode4() {
  console.log('\n📝 Test Mode 4: Ad-hoc Workflow');
  console.log('Document Type: Đề xuất (ID: 7)');
  
  const doc = await createDocument({
    file_name: 'proposal.pdf',
    document_type_id: 7,
    title: 'Test Ad-hoc Workflow',
    adhoc_steps: [
      {
        approver_user_id: 1,
        due_in_days: 3,
      },
      {
        approver_user_id: 1,
        due_in_days: 5,
      },
      {
        approver_user_id: 1,
        due_in_days: 7,
      },
    ],
  });
  
  console.log(`✅ Document created: ID=${doc.id}, Status=${doc.status}`);
  
  if (doc.status === 'pending_approval') {
    console.log('✅ PASS: Status is "pending_approval" (ad-hoc workflow created)');
  } else {
    console.log(`❌ FAIL: Expected status "pending_approval", got "${doc.status}"`);
  }
}

// Test Mode 4: Error (Missing adhoc_steps)
async function testMode4Error() {
  console.log('\n📝 Test Mode 4: Ad-hoc Error (Missing Steps)');
  console.log('Document Type: Đề xuất (ID: 7)');
  
  try {
    await createDocument({
      file_name: 'proposal-error.pdf',
      document_type_id: 7,
      title: 'Test Ad-hoc Error',
      // Missing adhoc_steps
    });
    
    console.log('❌ FAIL: Should have thrown error');
  } catch (error) {
    const errorData = JSON.parse(error.message);
    if (errorData.error?.code === 'AD_HOC_STEPS_REQUIRED') {
      console.log('✅ PASS: Correct error thrown');
    } else {
      console.log(`❌ FAIL: Wrong error: ${errorData.error?.code}`);
    }
  }
}

// Main
async function main() {
  try {
    await login();
    
    await testMode1();
    await testMode2();
    await testMode3Default();
    await testMode3Customized();
    await testMode4();
    await testMode4Error();
    
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
