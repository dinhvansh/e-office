const axios = require('axios');

const API_BASE = 'http://localhost:4000/api/v1';

async function testApprovalAPI() {
  console.log('🧪 Testing Approval API...\n');

  try {
    // Step 1: Login to get token
    console.log('1️⃣ Logging in...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@acme.local',
      password: 'password123'
    });

    console.log('✅ Login successful');
    
    const token = loginRes.data.data?.tokens?.accessToken;
    if (!token) {
      console.error('❌ No token in response!');
      console.log('Response:', JSON.stringify(loginRes.data, null, 2));
      return;
    }
    console.log('   Token:', token.substring(0, 30) + '...');

    // Step 2: Get my pending approvals
    console.log('\n2️⃣ Getting my pending approvals...');
    const pendingRes = await axios.get(`${API_BASE}/approvals/my-pending`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Response:', pendingRes.status);
    console.log('   Approvals count:', pendingRes.data.data.approvals.length);

    if (pendingRes.data.data.approvals.length === 0) {
      console.log('⚠️  No pending approvals found');
      return;
    }

    const firstApproval = pendingRes.data.data.approvals[0];
    console.log('   First approval ID:', firstApproval.id);

    // Step 3: Get approval detail
    console.log('\n3️⃣ Getting approval detail...');
    try {
      const detailRes = await axios.get(`${API_BASE}/approvals/${firstApproval.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('✅ Detail response:', detailRes.status);
      console.log('   Approval ID:', detailRes.data.data.id);
      console.log('   Action:', detailRes.data.data.action);
      console.log('   Document:', detailRes.data.data.document.title);
      console.log('   Workflow:', detailRes.data.data.workflow.name);
      console.log('   Step:', detailRes.data.data.workflow_step.step_name);
      console.log('   Approver:', detailRes.data.data.approver.full_name || detailRes.data.data.approver.email);

      console.log('\n🎉 SUCCESS! API is working correctly!');
      console.log('🔗 Test in browser: http://localhost:3000/approvals/' + firstApproval.id);

    } catch (detailError) {
      console.error('❌ Detail API Error:', detailError.response?.status);
      console.error('   Message:', detailError.response?.data?.error?.message);
      console.error('   Full error:', JSON.stringify(detailError.response?.data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testApprovalAPI();
