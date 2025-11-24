const axios = require('axios');

const API_BASE = 'http://localhost:4000/api/v1';

async function testAPIWorkflowApprovers() {
  console.log('🧪 Testing API - Workflow with Approvers\n');

  try {
    // Login
    console.log('1️⃣ Login...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@acme.local',
      password: 'password123'
    });
    
    const token = loginRes.data.data.tokens.accessToken;
    console.log('✅ Login successful\n');

    // Get document types
    console.log('2️⃣ Get document types...');
    const docTypesRes = await axios.get(`${API_BASE}/document-types`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const docTypes = docTypesRes.data.data;
    const hopDong = docTypes.find(dt => dt.name === 'Hợp đồng');
    const baoCao = docTypes.find(dt => dt.name === 'Báo cáo');
    
    console.log('✅ Found document types');
    console.log(`   Hợp đồng: workflow_id = ${hopDong?.default_workflow_id}`);
    console.log(`   Báo cáo: workflow_id = ${baoCao?.default_workflow_id}\n`);

    // Test Hợp đồng workflow
    if (hopDong?.default_workflow_id) {
      console.log('3️⃣ Get Hợp đồng workflow...');
      const workflowRes = await axios.get(`${API_BASE}/workflows/${hopDong.default_workflow_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const workflow = workflowRes.data.data.workflow;
      console.log('✅ Workflow:', workflow.name);
      console.log('   Steps:', workflow.steps?.length || 0);
      
      if (workflow.steps) {
        console.log('\n📋 Steps:');
        workflow.steps.forEach((step, idx) => {
          console.log(`\n${idx + 1}. ${step.step_name}`);
          console.log(`   Type: ${step.approver_type}`);
          console.log(`   Approver Name: ${step.approver_name || '❌ MISSING'}`);
          console.log(`   Approver Email: ${step.approver_email || '❌ MISSING'}`);
        });
      }
    }

    // Test Báo cáo workflow
    if (baoCao?.default_workflow_id) {
      console.log('\n\n4️⃣ Get Báo cáo workflow...');
      const workflowRes = await axios.get(`${API_BASE}/workflows/${baoCao.default_workflow_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const workflow = workflowRes.data.data.workflow;
      console.log('✅ Workflow:', workflow.name);
      console.log('   Steps:', workflow.steps?.length || 0);
      
      if (workflow.steps) {
        console.log('\n📋 Steps:');
        workflow.steps.forEach((step, idx) => {
          console.log(`\n${idx + 1}. ${step.step_name}`);
          console.log(`   Type: ${step.approver_type}`);
          console.log(`   Approver Name: ${step.approver_name || '❌ MISSING'}`);
          console.log(`   Approver Email: ${step.approver_email || '❌ MISSING'}`);
        });
      }
    }

    console.log('\n\n✅ Test completed!');

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

testAPIWorkflowApprovers();
