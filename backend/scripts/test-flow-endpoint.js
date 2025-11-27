// Test document flow endpoint via HTTP
const http = require('http');

function makeRequest(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function test() {
  console.log('🧪 Testing Document Flow Endpoint\n');

  try {
    // 1. Login
    console.log('1️⃣ Login as admin...');
    const loginRes = await makeRequest('/auth/login', 'POST', {
      email: 'admin@acme.local',
      password: 'password123',
    });

    if (loginRes.status !== 200) {
      throw new Error(`Login failed: ${JSON.stringify(loginRes.data)}`);
    }

    const token = loginRes.data.data.tokens.accessToken;
    console.log('✅ Login successful\n');

    // 2. Get documents
    console.log('2️⃣ Finding document with sign request...');
    const docsRes = await makeRequest('/documents', 'GET', null, token);

    if (docsRes.status !== 200) {
      throw new Error(`Get documents failed: ${JSON.stringify(docsRes.data)}`);
    }

    const documents = Array.isArray(docsRes.data.data) ? docsRes.data.data : [];
    
    // Try to find document with sign request, otherwise use first document
    let testDoc = documents.find(d => d.sign_request_id);
    
    if (!testDoc && documents.length > 0) {
      testDoc = documents[0];
      console.log(`⚠️ No document with sign request, using first document\n`);
    }

    if (!testDoc) {
      console.log('⚠️ No documents found');
      return;
    }

    console.log(`✅ Found document: ${testDoc.title} (ID: ${testDoc.id})`);
    console.log(`   - Has sign request: ${!!testDoc.sign_request_id}`);
    console.log(`   - Has workflow: ${!!testDoc.workflow_instance_id}\n`);

    // 3. Test flow endpoint
    console.log('3️⃣ Testing GET /documents/:id/flow...');
    const flowRes = await makeRequest(`/documents/${testDoc.id}/flow`, 'GET', null, token);

    if (flowRes.status !== 200) {
      console.error('❌ Flow endpoint failed:', flowRes.status);
      console.error('Response:', JSON.stringify(flowRes.data, null, 2));
      throw new Error('Flow endpoint failed');
    }

    const flowData = flowRes.data.data;
    console.log('✅ API Response received\n');

    // 4. Verify structure
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
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

test();
