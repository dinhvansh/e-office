const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api/v1';

async function testApproverLogin() {
  console.log('🔍 Test Approver Login & Approvals...\n');

  try {
    // 1. Login as approver
    console.log('1️⃣ Login as approver@acme.local...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'approver@acme.local',
      password: 'password123',
    });
    const token = loginRes.data.data.tokens.accessToken;
    console.log('✅ Login successful');
    console.log('   User:', loginRes.data.data.user.email);
    console.log('   Role:', loginRes.data.data.user.role);

    // 2. Get my pending approvals
    console.log('\n2️⃣ Get my pending approvals...');
    const pendingRes = await axios.get(`${BASE_URL}/approvals/my-pending`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('✅ Response:', pendingRes.status);
    const approvals = pendingRes.data.data || pendingRes.data;
    console.log('   Found:', Array.isArray(approvals) ? approvals.length : 0, 'approvals');
    
    if (Array.isArray(approvals) && approvals.length > 0) {
      console.log('\n📋 Approval list:');
      approvals.forEach((a, i) => {
        console.log(`   ${i + 1}. ID: ${a.id}`);
        console.log(`      Document: ${a.document?.title}`);
        console.log(`      Step: ${a.workflow_step?.step_name}`);
        console.log(`      Status: ${a.action}`);
        console.log(`      Due: ${a.due_date}`);
      });

      // 3. Get first approval detail
      const firstId = approvals[0].id;
      console.log(`\n3️⃣ Get approval detail (ID: ${firstId})...`);
      const detailRes = await axios.get(`${BASE_URL}/approvals/${firstId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('✅ Response:', detailRes.status);
      const detail = detailRes.data.data || detailRes.data;
      console.log('   Document:', detail.document?.title);
      console.log('   File:', detail.document?.original_file_name);
      console.log('   Workflow:', detail.workflow?.name);
      console.log('   Step:', detail.workflow_step?.step_name);
      console.log('   Approver:', detail.approver?.full_name || detail.approver?.email);
    }

    console.log('\n🎉 Test complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Login to frontend: http://localhost:3000');
    console.log('   2. Email: approver@acme.local');
    console.log('   3. Password: password123');
    console.log('   4. Navigate to: Phê duyệt của tôi');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testApproverLogin();
