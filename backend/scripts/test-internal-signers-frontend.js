/**
 * Test Script: Internal Signers Frontend Integration
 * 
 * Tests:
 * 1. Login as admin
 * 2. Get workflow with internal signers
 * 3. Verify workflow has signer steps
 * 4. Create document with workflow
 * 5. Verify internal signers auto-created
 */

const axios = require('axios');

const API_BASE = 'http://localhost:4000/api/v1';
let authToken = '';

async function login() {
  console.log('\n📝 Test 1: Login as admin');
  const response = await axios.post(`${API_BASE}/auth/login`, {
    email: 'admin@acme.local',
    password: 'password123',
  });
  
  authToken = response.data.data.tokens.accessToken;
  console.log('✅ Login successful');
  return authToken;
}

async function getWorkflowWithSigners() {
  console.log('\n📝 Test 2: Get workflow with internal signers');
  
  // Get all workflows
  const response = await axios.get(`${API_BASE}/workflows`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  
  const workflows = response.data.data.workflows || response.data.data;
  console.log(`Found ${workflows.length} workflows`);
  
  // Find workflow with signer steps
  for (const workflow of workflows) {
    const detailResponse = await axios.get(`${API_BASE}/workflows/${workflow.id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    
    const workflowDetail = detailResponse.data.data.workflow || detailResponse.data.data;
    const signerSteps = (workflowDetail.steps || []).filter(s => s.participant_role === 'signer');
    
    if (signerSteps.length > 0) {
      console.log(`✅ Found workflow: ${workflow.name} (ID: ${workflow.id})`);
      console.log(`   Signer steps: ${signerSteps.length}`);
      signerSteps.forEach(step => {
        console.log(`   - Step ${step.step_order}: ${step.step_name} (${step.approver_type})`);
      });
      return { workflow, signerSteps };
    }
  }
  
  console.log('⚠️ No workflow with signer steps found');
  return null;
}

async function createDocumentWithWorkflow(workflowId) {
  console.log('\n📝 Test 3: Create document with workflow');
  
  // Create simple PDF content
  const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n190\n%%EOF').toString('base64');
  
  const payload = {
    file_name: 'test-internal-signers.pdf',
    file_base64: pdfContent,
    document_type_id: 11, // Hợp đồng (HOP_DONG)
    workflow_id: workflowId,
  };
  
  const response = await axios.post(`${API_BASE}/documents`, payload, {
    headers: { 
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  // Handle different response structures
  const document = response.data.data?.document || response.data.data;
  console.log(`✅ Document created: ID ${document.id}`);
  console.log(`   Sign request ID: ${document.sign_request_id}`);
  
  if (!document.sign_request_id) {
    console.log('⚠️ No sign request ID in response');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  }
  
  return document;
}

async function verifyInternalSigners(signRequestId) {
  console.log('\n📝 Test 4: Verify internal signers auto-created');
  
  const response = await axios.get(`${API_BASE}/sign-requests/${signRequestId}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  
  const signRequest = response.data.data;
  const signers = signRequest.signers || [];
  
  console.log(`✅ Found ${signers.length} signers`);
  
  const internalSigners = signers.filter(s => s.is_internal === true);
  const externalSigners = signers.filter(s => s.is_internal === false);
  
  console.log(`   Internal signers: ${internalSigners.length}`);
  console.log(`   External signers: ${externalSigners.length}`);
  
  internalSigners.forEach(signer => {
    console.log(`   ✅ Internal: ${signer.name} (${signer.email}) - Order: ${signer.signing_order}`);
  });
  
  if (internalSigners.length === 0) {
    console.log('❌ No internal signers found!');
    return false;
  }
  
  return true;
}

async function runTests() {
  try {
    console.log('🧪 Testing Internal Signers Frontend Integration\n');
    console.log('='.repeat(60));
    
    // Test 1: Login
    await login();
    
    // Test 2: Get workflow with signers
    const workflowData = await getWorkflowWithSigners();
    if (!workflowData) {
      console.log('\n⚠️ Cannot continue - no workflow with signers found');
      console.log('💡 Run: node backend/scripts/seed-workflow-with-internal-signers.js');
      return;
    }
    
    // Test 3: Create document
    const document = await createDocumentWithWorkflow(workflowData.workflow.id);
    
    // Test 4: Verify signers
    const success = await verifyInternalSigners(document.sign_request_id);
    
    console.log('\n' + '='.repeat(60));
    if (success) {
      console.log('✅ All tests passed!');
      console.log('\n📊 Summary:');
      console.log(`   - Workflow: ${workflowData.workflow.name}`);
      console.log(`   - Document: ${document.id}`);
      console.log(`   - Sign Request: ${document.sign_request_id}`);
      console.log(`   - Internal signers: Auto-created ✅`);
    } else {
      console.log('❌ Tests failed!');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

runTests();
