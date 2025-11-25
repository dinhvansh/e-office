/**
 * Test Manager Approval Flow End-to-End
 */

const axios = require('axios');

async function testManagerApprovalFlow() {
  console.log('🧪 Testing Manager Approval Flow\n');

  try {
    // 1. Login as creator
    console.log('1️⃣ Login as creator...');
    const loginRes = await axios.post('http://localhost:4000/api/v1/auth/login', {
      email: 'creator@acme.local',
      password: 'password123'
    });

    const token = loginRes.data.data.tokens.accessToken;
    console.log('✅ Logged in\n');

    // 2. Check creator's manager
    console.log('2️⃣ Checking creator info...');
    const meRes = await axios.get('http://localhost:4000/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const creator = meRes.data.data.user;
    console.log('✅ Creator:', creator.email);
    console.log('   (Manager ID will be checked from database)\n');

    // 3. Get HOPDONG workflow
    console.log('\n3️⃣ Getting HOPDONG workflow...');
    const workflowsRes = await axios.get('http://localhost:4000/api/v1/workflows', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const workflowsData = workflowsRes.data.data;
    const workflows = Array.isArray(workflowsData) ? workflowsData : (workflowsData.workflows || []);
    const hopdongWorkflow = workflows.find(w => w.name === 'HOPDONG');
    
    if (!hopdongWorkflow) {
      console.log('❌ HOPDONG workflow not found');
      return;
    }

    console.log('✅ Workflow:', hopdongWorkflow.name);
    console.log('   ID:', hopdongWorkflow.id);

    // 4. Get a test document
    console.log('\n4️⃣ Getting test document...');
    const docsRes = await axios.get('http://localhost:4000/api/v1/documents?limit=1', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const documents = docsRes.data.data.documents || docsRes.data.data;
    const testDoc = documents.find(d => d.status === 'draft' || d.status === 'active');

    if (!testDoc) {
      console.log('❌ No suitable test document found');
      return;
    }

    console.log('✅ Document:', testDoc.id);
    console.log('   Title:', testDoc.title);
    console.log('   Status:', testDoc.status);

    // 5. Submit for approval
    console.log('\n5️⃣ Submitting for approval...');
    try {
      const submitRes = await axios.post(
        `http://localhost:4000/api/v1/approvals/submit`,
        {
          document_id: testDoc.id,
          workflow_id: hopdongWorkflow.id
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('✅ Submitted successfully!');
      console.log('   Response:', submitRes.data);

      // 6. Check created approvals
      console.log('\n6️⃣ Checking created approvals...');
      const approvalsRes = await axios.get(
        `http://localhost:4000/api/v1/approvals?document_id=${testDoc.id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const approvals = approvalsRes.data.data;
      console.log('✅ Approvals created:', approvals.length);

      if (approvals.length > 0) {
        approvals.forEach((approval, index) => {
          console.log(`\n   Approval ${index + 1}:`);
          console.log(`   - Step: ${approval.workflow_step?.step_name}`);
          console.log(`   - Approver ID: ${approval.approver_user_id}`);
          console.log(`   - Status: ${approval.action || approval.status}`);
        });

        // Check if approver@acme.local (ID: 17) is the approver
        const expectedManagerId = 17; // approver@acme.local
        const managerApproval = approvals.find(a => a.approver_user_id === expectedManagerId);
        
        if (managerApproval) {
          console.log('\n✅ SUCCESS! Manager is assigned as approver!');
          console.log('   Manager ID:', expectedManagerId);
          console.log('   Manager Email: approver@acme.local');
          console.log('   Step:', managerApproval.workflow_step?.step_name);
        } else {
          console.log('\n❌ FAILED! Manager not found in approvers');
          console.log('   Expected Manager ID:', expectedManagerId);
          console.log('   Actual Approver IDs:', approvals.map(a => a.approver_user_id));
        }
      }

    } catch (submitError) {
      if (submitError.response?.data?.message?.includes('already has an active workflow')) {
        console.log('⚠️ Document already has workflow');
        console.log('   Checking existing approvals...');
        
        const approvalsRes = await axios.get(
          `http://localhost:4000/api/v1/approvals?document_id=${testDoc.id}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        const approvals = approvalsRes.data.data;
        console.log('✅ Existing approvals:', approvals.length);

        if (approvals.length > 0) {
          const expectedManagerId = 17;
          const managerApproval = approvals.find(a => a.approver_user_id === expectedManagerId);
          
          if (managerApproval) {
            console.log('\n✅ Manager is assigned as approver!');
            console.log('   Manager ID:', expectedManagerId);
          } else {
            console.log('\n❌ Manager not found in approvers');
            console.log('   Expected:', expectedManagerId);
            console.log('   Actual:', approvals.map(a => a.approver_user_id));
          }
        }
      } else {
        throw submitError;
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testManagerApprovalFlow();
