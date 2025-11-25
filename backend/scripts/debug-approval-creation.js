/**
 * Debug approval creation flow
 */

const axios = require('axios');

const API_BASE = 'http://localhost:4000/api/v1';

async function debug() {
  console.log('🔍 Debugging Approval Creation Flow\n');
  
  // 1. Login as admin
  console.log('1️⃣ Login as admin...');
  const loginRes = await axios.post(`${API_BASE}/auth/login`, {
    email: 'admin@acme.local',
    password: 'password123'
  });
  const token = loginRes.data.data.tokens.accessToken;
  console.log('✅ Logged in\n');
  
  // 2. Check document 67
  console.log('2️⃣ Checking document 67...');
  const docRes = await axios.get(`${API_BASE}/documents/67`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const doc = docRes.data.data;
  console.log(`   Document: ${doc.title}`);
  console.log(`   Status: ${doc.status}`);
  console.log(`   Sign Request ID: ${doc.sign_request_id}`);
  console.log('');
  
  // 3. Check workflow 12
  console.log('3️⃣ Checking workflow 12...');
  try {
    const workflowRes = await axios.get(`${API_BASE}/workflows/12`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const workflow = workflowRes.data.data;
    console.log(`   Workflow: ${workflow.name}`);
    console.log(`   Status: ${workflow.is_active}`);
    console.log(`   Steps: ${workflow.steps?.length || 0}`);
    if (workflow.steps) {
      workflow.steps.forEach(step => {
        console.log(`     - Step ${step.step_order}: ${step.step_name} (${step.approver_type})`);
      });
    }
  } catch (err) {
    console.log('   ❌ Error:', err.response?.data || err.message);
  }
  console.log('');
  
  // 4. Try to submit for approval
  console.log('4️⃣ Submitting for approval...');
  try {
    const submitRes = await axios.post(
      `${API_BASE}/approvals/submit`,
      {
        document_id: 67,
        workflow_id: 12
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    console.log('✅ Submit response:');
    console.log(JSON.stringify(submitRes.data, null, 2));
  } catch (err) {
    console.log('❌ Submit failed:');
    console.log('   Status:', err.response?.status);
    console.log('   Data:', JSON.stringify(err.response?.data, null, 2));
    console.log('   Message:', err.message);
  }
  console.log('');
  
  // 5. Check if workflow instance was created
  console.log('5️⃣ Checking workflow instances...');
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const instance = await prisma.workflow_instances.findUnique({
      where: { document_id: 67 }
    });
    
    if (instance) {
      console.log('✅ Workflow instance found:');
      console.log(`   ID: ${instance.id}`);
      console.log(`   Status: ${instance.status}`);
      console.log(`   Current Step: ${instance.current_step_id}`);
    } else {
      console.log('❌ No workflow instance found for document 67');
    }
    
    // Check approvals
    const approvals = await prisma.document_approvals.findMany({
      where: { document_id: 67 }
    });
    
    console.log(`\n   Approvals found: ${approvals.length}`);
    approvals.forEach(a => {
      console.log(`     - ID: ${a.id}, Approver: ${a.approver_user_id}, Action: ${a.action}`);
    });
    
    await prisma.$disconnect();
  } catch (err) {
    console.log('❌ Database check failed:', err.message);
  }
}

debug().catch(console.error);
