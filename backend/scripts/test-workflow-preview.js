const axios = require('axios');

const API_BASE = 'http://localhost:4000/api/v1';

async function testWorkflowPreview() {
  console.log('🧪 Testing Workflow Preview with Approver Info\n');

  try {
    // Step 1: Login
    console.log('1️⃣ Login as admin...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@acme.local',
      password: 'password123'
    });
    
    const token = loginRes.data.data.tokens.accessToken;
    console.log('✅ Login successful\n');

    // Step 2: Get workflows
    console.log('2️⃣ Get workflows...');
    const workflowsRes = await axios.get(`${API_BASE}/workflows`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const workflows = workflowsRes.data.data.workflows;
    console.log(`✅ Found ${workflows.length} workflows\n`);

    // Step 3: Get first workflow details
    if (workflows.length > 0) {
      const workflowId = workflows[0].id;
      console.log(`3️⃣ Get workflow details (ID: ${workflowId})...`);
      
      const workflowRes = await axios.get(`${API_BASE}/workflows/${workflowId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const workflow = workflowRes.data.data.workflow;
      console.log('✅ Workflow:', workflow.name);
      console.log('   Steps:', workflow.steps?.length || 0);
      console.log('');
      
      if (workflow.steps && workflow.steps.length > 0) {
        console.log('📋 Steps with Approver Info:');
        workflow.steps.forEach((step, idx) => {
          console.log(`\n${idx + 1}. ${step.step_name}`);
          console.log(`   Type: ${step.approver_type}`);
          console.log(`   Approver Name: ${step.approver_name || 'N/A'}`);
          console.log(`   Approver Email: ${step.approver_email || 'N/A'}`);
          console.log(`   Due: ${step.due_in_days} days`);
        });
      }
      
      console.log('\n✅ Test completed successfully!');
    } else {
      console.log('⚠️  No workflows found');
    }

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

testWorkflowPreview();
