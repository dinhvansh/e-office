// Test unified flow endpoint with existing document
const axios = require('axios');

const API_BASE = 'http://localhost:4000/api/v1';

async function testUnifiedFlowEndpoint() {
  console.log('🧪 Testing Unified Flow Endpoint\n');

  try {
    // 1. Login as admin
    console.log('1️⃣ Logging in as admin...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@acme.local',
      password: 'password123',
    });

    const token = loginRes.data.data.tokens.accessToken;
    console.log('✅ Login successful\n');

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    // 2. Find a document with both workflow and sign request
    console.log('2️⃣ Finding document with workflow + signing...');
    const docsRes = await axios.get(`${API_BASE}/documents`, { headers });
    const documents = Array.isArray(docsRes.data.data) 
      ? docsRes.data.data 
      : docsRes.data.data.documents || [];

    // Find document with both workflow_instance_id and sign_request_id
    const testDoc = documents.find(
      (doc) => doc.workflow_instance_id && doc.sign_request_id
    );

    if (!testDoc) {
      console.log('⚠️ No document found with both workflow and signing');
      console.log('   Creating test scenario...\n');

      // Find any document with sign request
      const docWithSignRequest = documents.find((doc) => doc.sign_request_id);
      
      if (docWithSignRequest) {
        console.log(`✅ Found document with sign request: ${docWithSignRequest.id}`);
        console.log(`   Title: ${docWithSignRequest.title}`);
        console.log(`   Sign Request ID: ${docWithSignRequest.sign_request_id}\n`);

        // Test with this document (may not have workflow)
        console.log('3️⃣ Testing flow endpoint...');
        const flowRes = await axios.get(
          `${API_BASE}/documents/${docWithSignRequest.id}/flow`,
          { headers }
        );

        console.log('✅ API Response received!\n');
        console.log('📊 Response Structure:');
        console.log(JSON.stringify(flowRes.data.data, null, 2));

        return;
      }

      console.log('❌ No suitable test document found');
      console.log('   Please create a document with sign request first');
      return;
    }

    console.log(`✅ Found test document: ${testDoc.id}`);
    console.log(`   Title: ${testDoc.title}`);
    console.log(`   Workflow Instance: ${testDoc.workflow_instance_id}`);
    console.log(`   Sign Request: ${testDoc.sign_request_id}\n`);

    // 3. Test flow endpoint
    console.log('3️⃣ Testing flow endpoint...');
    const flowRes = await axios.get(
      `${API_BASE}/documents/${testDoc.id}/flow`,
      { headers }
    );

    console.log('✅ API Response received!\n');

    // 4. Validate response structure
    console.log('4️⃣ Validating response structure...');
    const data = flowRes.data.data;

    const checks = [
      { field: 'document', exists: !!data.document },
      { field: 'phases', exists: Array.isArray(data.phases) },
      { field: 'steps', exists: Array.isArray(data.steps) },
      { field: 'activities', exists: Array.isArray(data.activities) },
      { field: 'can_approve', exists: typeof data.can_approve === 'boolean' },
      { field: 'can_sign', exists: typeof data.can_sign === 'boolean' },
    ];

    let allValid = true;
    checks.forEach((check) => {
      const status = check.exists ? '✅' : '❌';
      console.log(`   ${status} ${check.field}: ${check.exists ? 'OK' : 'MISSING'}`);
      if (!check.exists) allValid = false;
    });

    console.log();

    // 5. Display summary
    console.log('📋 Flow Summary:');
    console.log(`   Document: ${data.document.title}`);
    console.log(`   Status: ${data.document.status}`);
    console.log(`   Phases: ${data.phases.length}`);
    data.phases.forEach((phase) => {
      console.log(`     - ${phase.label}: ${phase.status}`);
    });
    console.log(`   Steps: ${data.steps.length}`);
    data.steps.forEach((step) => {
      console.log(`     - ${step.type} (order ${step.order}): ${step.status}`);
    });
    console.log(`   Activities: ${data.activities.length}`);
    console.log(`   Can Approve: ${data.can_approve}`);
    console.log(`   Can Sign: ${data.can_sign}\n`);

    if (allValid) {
      console.log('🎉 All tests passed! Backend API working correctly.\n');
      console.log('✅ READY FOR UI TESTING');
      console.log(`   URL: http://localhost:3000/documents/${testDoc.id}/flow\n`);
    } else {
      console.log('❌ Some checks failed. Please review the response structure.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

testUnifiedFlowEndpoint();
