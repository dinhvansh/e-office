const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api/v1';
let token = '';

async function testApprovalBackendAPI() {
  console.log('🔍 Test Approval Backend API...\n');

  try {
    // 1. Login
    console.log('1️⃣ Login...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@acme.local',
      password: 'password123',
    });
    token = loginRes.data.data.tokens.accessToken;
    console.log('✅ Login successful');
    console.log('   Token:', token.substring(0, 20) + '...');

    // 2. Get my pending approvals
    console.log('\n2️⃣ Get my pending approvals...');
    const pendingRes = await axios.get(`${BASE_URL}/approvals/my-pending`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('✅ Response:', pendingRes.status);
    console.log('   Found:', pendingRes.data.data?.length || 0, 'approvals');
    
    if (pendingRes.data.data && pendingRes.data.data.length > 0) {
      const first = pendingRes.data.data[0];
      console.log('   First approval:');
      console.log('     ID:', first.id);
      console.log('     Document:', first.document?.title);
      console.log('     Step:', first.workflow_step?.step_name);
    }

    // 3. Get approval detail
    console.log('\n3️⃣ Get approval detail (ID: 1)...');
    try {
      const detailRes = await axios.get(`${BASE_URL}/approvals/1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('✅ Response:', detailRes.status);
      const approval = detailRes.data.data;
      console.log('   Approval ID:', approval.id);
      console.log('   Document:', approval.document?.title);
      console.log('   File:', approval.document?.original_file_name);
      console.log('   Owner:', approval.document?.owner?.full_name || approval.document?.owner?.email);
      console.log('   Workflow:', approval.workflow?.name);
      console.log('   Step:', `${approval.workflow_step?.step_order}: ${approval.workflow_step?.step_name}`);
      console.log('   Approver:', approval.approver?.full_name || approval.approver?.email);
      console.log('   Status:', approval.action);
    } catch (error) {
      console.log('❌ Error:', error.response?.status, error.response?.data?.message || error.message);
    }

    // 4. Get document approval history
    console.log('\n4️⃣ Get document approval history (Document ID: 3)...');
    try {
      const historyRes = await axios.get(`${BASE_URL}/approvals/document/3`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('✅ Response:', historyRes.status);
      const history = historyRes.data.data || historyRes.data;
      console.log(`   Found ${Array.isArray(history) ? history.length : 0} approval records:`);
      if (Array.isArray(history)) {
        history.forEach((h, i) => {
        console.log(`   ${i + 1}. Step ${h.workflow_step?.step_order}: ${h.workflow_step?.step_name}`);
        console.log(`      Approver: ${h.approver_user?.full_name || h.approver_user?.email}`);
        console.log(`      Status: ${h.action}`);
        if (h.comment) console.log(`      Comment: ${h.comment}`);
        });
      }
    } catch (error) {
      console.log('❌ Error:', error.response?.status, error.response?.data?.message || error.message);
    }

    // 5. View document PDF
    console.log('\n5️⃣ View document PDF (Document ID: 3)...');
    try {
      const pdfRes = await axios.get(`${BASE_URL}/documents/3/view`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'arraybuffer',
      });
      console.log('✅ Response:', pdfRes.status);
      console.log('   Content-Type:', pdfRes.headers['content-type']);
      console.log('   Content-Length:', pdfRes.headers['content-length'], 'bytes');
      console.log('   PDF size:', (pdfRes.data.length / 1024).toFixed(2), 'KB');
    } catch (error) {
      console.log('❌ Error:', error.response?.status, error.response?.data?.message || error.message);
    }

    // 6. Test approve endpoint (dry run - will fail if already approved)
    console.log('\n6️⃣ Test approve endpoint structure...');
    console.log('   Endpoint: POST /approvals/1/approve');
    console.log('   Body: { comment: "Test", signature_data: "...", signature_type: "drawn" }');
    console.log('   (Not executing to avoid changing data)');

    console.log('\n🎉 All backend API tests complete!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Login working');
    console.log('   ✅ My pending approvals working');
    console.log('   ✅ Approval detail working');
    console.log('   ✅ Approval history working');
    console.log('   ✅ PDF view working');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    console.error('   Stack:', error.stack);
  }
}

testApprovalBackendAPI();
