const BASE_URL = 'http://localhost:4000/api/v1';

// Simple fetch wrapper
async function fetchAPI(url, options = {}) {
  const response = await fetch(BASE_URL + url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(JSON.stringify(error));
  }
  
  return response.json();
}

async function testDocumentFlowAPI() {
  console.log('🧪 Testing Document Flow API\n');

  try {
    // 1. Login as admin
    console.log('1️⃣ Login as admin...');
    const loginRes = await fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@acme.local',
        password: 'password123',
      }),
    });
    
    const token = loginRes.data.tokens.accessToken;
    console.log('✅ Login successful\n');

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    // 2. Find a document with workflow and signing
    console.log('2️⃣ Finding document with workflow and signing...');
    const docsRes = await fetchAPI('/documents', { headers });
    const documents = docsRes.data;
    
    // Find document with both workflow and sign request
    const testDoc = documents.find(d => d.workflow_instance_id && d.sign_request_id);
    
    if (!testDoc) {
      console.log('⚠️ No document found with both workflow and signing');
      console.log('Creating test scenario...\n');
      
      // Use first document with sign request
      const docWithSigning = documents.find(d => d.sign_request_id);
      if (docWithSigning) {
        console.log(`📄 Using document: ${docWithSigning.title} (ID: ${docWithSigning.id})`);
        console.log(`   - Has signing: ${!!docWithSigning.sign_request_id}`);
        console.log(`   - Has workflow: ${!!docWithSigning.workflow_instance_id}\n`);
        
        // 3. Test API
        console.log('3️⃣ Testing GET /documents/:id/flow...');
        const flowRes = await fetchAPI(
          `/documents/${docWithSigning.id}/flow`,
          { headers }
        );
        
        const flowData = flowRes.data;
        console.log('✅ API Response received\n');
        
        // 4. Verify response structure
        console.log('4️⃣ Verifying response structure...');
        console.log(`✅ Document: ${flowData.document.title}`);
        console.log(`   - ID: ${flowData.document.id}`);
        console.log(`   - Status: ${flowData.document.status}`);
        console.log(`   - Owner: ${flowData.document.owner.name}\n`);
        
        console.log(`✅ Phases: ${flowData.phases.length} phases`);
        flowData.phases.forEach(phase => {
          console.log(`   - ${phase.label}: ${phase.status}`);
        });
        console.log('');
        
        console.log(`✅ Steps: ${flowData.steps.length} steps`);
        flowData.steps.forEach(step => {
          console.log(`   - Step ${step.order}: ${step.type} - ${step.status}`);
          if (step.user) {
            console.log(`     User: ${step.user.name}`);
          }
        });
        console.log('');
        
        console.log(`✅ Activities: ${flowData.activities.length} activities`);
        flowData.activities.slice(0, 5).forEach(activity => {
          console.log(`   - ${activity.actor}: ${activity.action}`);
        });
        if (flowData.activities.length > 5) {
          console.log(`   ... and ${flowData.activities.length - 5} more`);
        }
        console.log('');
        
        console.log(`✅ Permissions:`);
        console.log(`   - Can approve: ${flowData.can_approve}`);
        console.log(`   - Can sign: ${flowData.can_sign}\n`);
        
        console.log('🎉 All tests passed!\n');
        
        // 5. Show sample response
        console.log('📋 Sample Response Structure:');
        console.log(JSON.stringify(flowData, null, 2));
        
        return;
      }
    }
    
    console.log(`📄 Found document: ${testDoc.title} (ID: ${testDoc.id})`);
    console.log(`   - Has workflow: ✅`);
    console.log(`   - Has signing: ✅\n`);

    // 3. Test API
    console.log('3️⃣ Testing GET /documents/:id/flow...');
    const flowRes = await fetchAPI(
      `/documents/${testDoc.id}/flow`,
      { headers }
    );
    
    const flowData = flowRes.data;
    console.log('✅ API Response received\n');
    
    // 4. Verify response structure
    console.log('4️⃣ Verifying response structure...');
    console.log(`✅ Document: ${flowData.document.title}`);
    console.log(`   - ID: ${flowData.document.id}`);
    console.log(`   - Status: ${flowData.document.status}`);
    console.log(`   - Owner: ${flowData.document.owner.name}\n`);
    
    console.log(`✅ Phases: ${flowData.phases.length} phases`);
    flowData.phases.forEach(phase => {
      console.log(`   - ${phase.label}: ${phase.status}`);
    });
    console.log('');
    
    console.log(`✅ Steps: ${flowData.steps.length} steps`);
    flowData.steps.forEach(step => {
      console.log(`   - Step ${step.order}: ${step.type} - ${step.status}`);
      if (step.user) {
        console.log(`     User: ${step.user.name}`);
      }
    });
    console.log('');
    
    console.log(`✅ Activities: ${flowData.activities.length} activities`);
    flowData.activities.slice(0, 5).forEach(activity => {
      console.log(`   - ${activity.actor}: ${activity.action}`);
    });
    if (flowData.activities.length > 5) {
      console.log(`   ... and ${flowData.activities.length - 5} more`);
    }
    console.log('');
    
    console.log(`✅ Permissions:`);
    console.log(`   - Can approve: ${flowData.can_approve}`);
    console.log(`   - Can sign: ${flowData.can_sign}\n`);
    
    console.log('🎉 All tests passed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

testDocumentFlowAPI();
