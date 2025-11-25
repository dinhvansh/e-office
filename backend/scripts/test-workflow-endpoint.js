/**
 * Test actual workflow API endpoint
 */

const axios = require('axios');

async function testWorkflowEndpoint() {
  console.log('🧪 Testing Workflow API Endpoint\n');

  try {
    // 1. Login as creator
    console.log('1️⃣ Logging in as creator...');
    const loginRes = await axios.post('http://localhost:4000/api/v1/auth/login', {
      email: 'creator@acme.local',
      password: 'password123'
    });

    const token = loginRes.data.data.tokens.accessToken;
    console.log('✅ Login successful');
    console.log('   Token:', token.substring(0, 20) + '...');

    // 2. Get HOPDONG workflow
    console.log('\n2️⃣ Getting HOPDONG workflow...');
    const workflowRes = await axios.get('http://localhost:4000/api/v1/workflows/8', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const workflow = workflowRes.data.data;
    console.log('✅ Workflow retrieved');
    console.log('   Name:', workflow.name);
    console.log('   Steps:', workflow.steps?.length || 0);

    // 3. Check steps data
    console.log('\n3️⃣ Checking steps data...');
    if (workflow.steps && workflow.steps.length > 0) {
      workflow.steps.forEach((step, index) => {
        console.log(`\n   Step ${index + 1}: ${step.step_name}`);
        console.log(`   - Approver Type: ${step.approver_type}`);
        console.log(`   - Approver Name: ${step.approver_name || '❌ MISSING'}`);
        console.log(`   - Approver Email: ${step.approver_email || '❌ MISSING'}`);
      });

      const allHaveInfo = workflow.steps.every(s => s.approver_name && s.approver_email);
      
      if (allHaveInfo) {
        console.log('\n✅ ALL STEPS HAVE APPROVER INFO IN API RESPONSE!');
        console.log('\n📝 If frontend still not showing:');
        console.log('   1. Clear browser cache (Ctrl+Shift+R)');
        console.log('   2. Check React Query cache');
        console.log('   3. Check console for errors');
      } else {
        console.log('\n❌ SOME STEPS MISSING APPROVER INFO IN API');
      }
    } else {
      console.log('❌ No steps found in response');
    }

    // 4. Full response
    console.log('\n4️⃣ Full API Response:');
    console.log(JSON.stringify(workflow, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testWorkflowEndpoint();
