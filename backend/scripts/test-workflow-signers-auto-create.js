const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:4000/api/v1';

async function testWorkflowSignersAutoCreate() {
  console.log('🧪 Testing Workflow Signers Auto-Create\n');

  try {
    // Step 1: Login
    console.log('1️⃣ Login as admin...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@acme.local',
      password: 'password123'
    });
    
    const token = loginRes.data.data.tokens.accessToken;
    console.log('✅ Login successful\n');

    // Step 2: Get document types with workflow
    console.log('2️⃣ Get document types...');
    const docTypesRes = await axios.get(`${API_BASE}/document-types`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const docTypes = docTypesRes.data.data.document_types || docTypesRes.data.data;
    const docTypeWithWorkflow = docTypes.find(dt => 
      dt.require_digital_signing && dt.require_approval && dt.default_workflow_id
    );
    
    if (!docTypeWithWorkflow) {
      console.log('⚠️  No document type with workflow found');
      console.log('   Creating one...');
      
      // Get a workflow
      const workflowsRes = await axios.get(`${API_BASE}/workflows`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const workflow = workflowsRes.data.data.workflows[0];
      
      // Update first document type
      await axios.put(`${API_BASE}/document-types/${docTypes[0].id}`, {
        require_digital_signing: true,
        require_approval: true,
        default_workflow_id: workflow.id,
        allow_workflow_override: false
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Updated document type:', docTypes[0].name);
      console.log('   Workflow:', workflow.name);
      console.log('');
    } else {
      console.log('✅ Found document type:', docTypeWithWorkflow.name);
      console.log('   Workflow ID:', docTypeWithWorkflow.default_workflow_id);
      console.log('');
    }

    // Use the found document type
    const updatedDocType = docTypeWithWorkflow;

    // Step 3: Get workflow details
    console.log('3️⃣ Get workflow details...');
    const workflowRes = await axios.get(`${API_BASE}/workflows/${updatedDocType.default_workflow_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const workflow = workflowRes.data.data.workflow;
    console.log('✅ Workflow:', workflow.name);
    console.log('   Steps:', workflow.steps?.length || 0);
    
    if (workflow.steps && workflow.steps.length > 0) {
      workflow.steps.forEach((step, idx) => {
        console.log(`   ${idx + 1}. ${step.step_name} (${step.approver_type})`);
      });
    }
    console.log('');

    // Step 4: Upload document with workflow
    console.log('4️⃣ Upload document with workflow...');
    
    // Create a dummy PDF
    const dummyPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n190\n%%EOF');
    const base64Pdf = dummyPdf.toString('base64');
    
    const uploadRes = await axios.post(`${API_BASE}/documents`, {
      file_name: 'test-workflow-signers.pdf',
      file_base64: base64Pdf,
      document_type_id: updatedDocType.id,
      workflow_id: updatedDocType.default_workflow_id, // ✅ Pass workflow_id
      title: 'Test Document with Workflow Signers',
      confidential_level: 'normal',
      visibility_scope: 'public'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const document = uploadRes.data.data.document;
    console.log('✅ Document uploaded');
    console.log('   ID:', document.id);
    console.log('   Sign Request ID:', document.sign_request_id);
    console.log('');

    // Step 5: Check signers
    console.log('5️⃣ Check signers...');
    const editorRes = await axios.get(`${API_BASE}/sign-requests/${document.sign_request_id}/editor`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const signers = editorRes.data.data.signRequest?.signers || [];
    console.log('✅ Signers count:', signers.length);
    
    if (signers.length > 0) {
      console.log('   Signers:');
      signers.forEach((signer, idx) => {
        console.log(`   ${idx + 1}. ${signer.name} (${signer.email})`);
        console.log(`      Order: ${signer.signing_order}`);
        console.log(`      Status: ${signer.status}`);
      });
    } else {
      console.log('   ⚠️  No signers found!');
    }
    console.log('');

    // Step 6: Verify
    console.log('6️⃣ Verification...');
    const expectedSigners = workflow.steps?.length || 0;
    const actualSigners = signers.length;
    
    if (actualSigners === expectedSigners) {
      console.log('✅ SUCCESS! Signers auto-created correctly');
      console.log(`   Expected: ${expectedSigners}, Got: ${actualSigners}`);
    } else {
      console.log('❌ FAILED! Signers count mismatch');
      console.log(`   Expected: ${expectedSigners}, Got: ${actualSigners}`);
    }

    console.log('\n🎉 Test completed!');

  } catch (error) {
    console.error('\n❌ Test failed!');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Error:', error.message);
    }
    process.exit(1);
  }
}

testWorkflowSignersAutoCreate();
