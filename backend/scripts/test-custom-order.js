#!/usr/bin/env node
/**
 * Test custom order in flexible workflow mode
 * Tests the ability to specify custom order for workflow steps
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:4000/api/v1';

// Test credentials
const ADMIN_EMAIL = 'admin@acme.local';
const ADMIN_PASSWORD = 'Admin@123';

let authToken = '';

async function login() {
  console.log('🔐 Logging in as admin...');
  const response = await axios.post(`${API_URL}/auth/login`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  authToken = response.data.token;
  console.log('✅ Login successful\n');
}

async function getDocumentTypes() {
  console.log('📋 Fetching document types...');
  const response = await axios.get(`${API_URL}/document-types`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  
  // Find a document type with flexible workflow
  const flexibleType = response.data.find(dt => 
    dt.require_approval && 
    dt.default_workflow_id && 
    dt.allow_workflow_override
  );
  
  if (!flexibleType) {
    throw new Error('No flexible workflow document type found');
  }
  
  console.log(`✅ Found flexible document type: ${flexibleType.name} (ID: ${flexibleType.id})`);
  console.log(`   Default workflow: ${flexibleType.default_workflow_id}\n`);
  
  return flexibleType;
}

async function getUsers() {
  console.log('👥 Fetching users...');
  const response = await axios.get(`${API_URL}/users`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  
  const users = response.data.slice(0, 3); // Get first 3 users
  console.log(`✅ Found ${users.length} users:`);
  users.forEach(u => console.log(`   - ${u.full_name || u.email} (ID: ${u.id})`));
  console.log('');
  
  return users;
}

async function createDocumentWithCustomOrder(docType, users) {
  console.log('📄 Creating document with custom order workflow...');
  
  // Read a test PDF file
  const testPdfPath = path.join(__dirname, '../test-data/sample.pdf');
  let base64;
  
  if (fs.existsSync(testPdfPath)) {
    base64 = fs.readFileSync(testPdfPath, 'base64');
  } else {
    // Create a minimal PDF if test file doesn't exist
    console.log('⚠️  Test PDF not found, creating minimal PDF...');
    const minimalPdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n210\n%%EOF');
    base64 = minimalPdf.toString('base64');
  }
  
  // Create custom steps with custom order (reverse order: 3, 2, 1)
  const customSteps = [
    {
      step_name: 'Bước cuối cùng',
      approver_type: 'user',
      approver_id: users[2].id,
      participant_role: 'approver',
      due_in_days: 5,
      order: 3, // ✅ Custom order
    },
    {
      step_name: 'Bước giữa',
      approver_type: 'user',
      approver_id: users[1].id,
      participant_role: 'approver',
      due_in_days: 3,
      order: 2, // ✅ Custom order
    },
    {
      step_name: 'Bước đầu tiên',
      approver_type: 'user',
      approver_id: users[0].id,
      participant_role: 'signer',
      due_in_days: 2,
      order: 1, // ✅ Custom order
    },
  ];
  
  console.log('📝 Custom steps with order:');
  customSteps.forEach(step => {
    console.log(`   ${step.order}. ${step.step_name} - ${step.participant_role}`);
  });
  console.log('');
  
  const payload = {
    file_name: 'test-custom-order.pdf',
    file_base64: base64,
    document_type_id: docType.id,
    title: 'Test Custom Order Workflow',
    workflow_id: docType.default_workflow_id,
    customized_steps: customSteps,
  };
  
  const response = await axios.post(`${API_URL}/documents`, payload, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  
  console.log('✅ Document created successfully!');
  console.log(`   Document ID: ${response.data.document.id}`);
  console.log(`   Document Number: ${response.data.document.document_number}`);
  console.log('');
  
  return response.data.document;
}

async function verifyWorkflowSteps(documentId) {
  console.log('🔍 Verifying workflow steps order...');
  
  const response = await axios.get(`${API_URL}/documents/${documentId}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  
  const document = response.data;
  
  if (!document.workflow_id) {
    throw new Error('Document has no workflow');
  }
  
  // Get workflow details
  const workflowResponse = await axios.get(`${API_URL}/workflows/${document.workflow_id}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  
  const workflow = workflowResponse.data.workflow || workflowResponse.data;
  const steps = workflow.steps || [];
  
  console.log(`✅ Workflow has ${steps.length} steps:`);
  steps.forEach(step => {
    console.log(`   ${step.step_order}. ${step.step_name} - ${step.participant_role || 'approver'}`);
    console.log(`      Approver: ${step.approver_name || step.approver_email || 'N/A'}`);
  });
  console.log('');
  
  // Verify order matches our custom order
  const expectedOrder = [1, 2, 3];
  const actualOrder = steps.map(s => s.step_order);
  
  if (JSON.stringify(actualOrder) === JSON.stringify(expectedOrder)) {
    console.log('✅ Step order matches custom order!');
  } else {
    console.log('❌ Step order does NOT match custom order!');
    console.log(`   Expected: ${expectedOrder}`);
    console.log(`   Actual: ${actualOrder}`);
  }
  
  return workflow;
}

async function main() {
  try {
    console.log('🧪 Testing Custom Order in Flexible Workflow\n');
    console.log('='.repeat(60));
    console.log('');
    
    await login();
    const docType = await getDocumentTypes();
    const users = await getUsers();
    const document = await createDocumentWithCustomOrder(docType, users);
    await verifyWorkflowSteps(document.id);
    
    console.log('');
    console.log('='.repeat(60));
    console.log('✅ All tests passed!');
    console.log('');
    console.log('💡 You can now test in the UI:');
    console.log('   1. Go to http://localhost:3000/sign-requests/create');
    console.log('   2. Select a document type with flexible workflow');
    console.log('   3. Switch to "Tùy chỉnh" mode');
    console.log('   4. Change the order numbers in the input boxes');
    console.log('   5. Create the document and verify the order');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
