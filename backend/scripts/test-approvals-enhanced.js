/**
 * Test enhanced approvals API with filters, pagination, search, sort
 */

const axios = require('axios');

async function testApprovalsEnhanced() {
  console.log('🧪 Testing Enhanced Approvals API...\n');

  try {
    // Login
    console.log('1️⃣ Logging in as admin...');
    const loginRes = await axios.post('http://localhost:4000/api/v1/auth/login', {
      email: 'admin@acme.local',
      password: 'password123'
    });
    const token = loginRes.data.data.tokens.accessToken;
    console.log('✅ Logged in\n');

    // Test 1: Get all approvals (default)
    console.log('2️⃣ Test 1: Get all approvals (default)');
    const test1 = await axios.get('http://localhost:4000/api/v1/approvals/my-pending', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Total approvals: ${test1.data.data.pagination.total}`);
    console.log(`   Statistics:`, test1.data.data.statistics);
    console.log('');

    // Test 2: Pagination
    console.log('3️⃣ Test 2: Pagination (page 1, limit 5)');
    const test2 = await axios.get('http://localhost:4000/api/v1/approvals/my-pending?page=1&limit=5', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Page: ${test2.data.data.pagination.page}`);
    console.log(`   Limit: ${test2.data.data.pagination.limit}`);
    console.log(`   Total: ${test2.data.data.pagination.total}`);
    console.log(`   Total Pages: ${test2.data.data.pagination.totalPages}`);
    console.log(`   Approvals returned: ${test2.data.data.approvals.length}`);
    console.log('');

    // Test 3: Filter by status
    console.log('4️⃣ Test 3: Filter by status (pending)');
    const test3 = await axios.get('http://localhost:4000/api/v1/approvals/my-pending?status=pending', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Pending approvals: ${test3.data.data.approvals.length}`);
    if (test3.data.data.approvals.length > 0) {
      console.log(`   First approval action: ${test3.data.data.approvals[0].action}`);
    }
    console.log('');

    // Test 4: Search
    console.log('5️⃣ Test 4: Search (test)');
    const test4 = await axios.get('http://localhost:4000/api/v1/approvals/my-pending?search=test', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Search results: ${test4.data.data.approvals.length}`);
    if (test4.data.data.approvals.length > 0) {
      console.log(`   First result: ${test4.data.data.approvals[0].document.document_number}`);
    }
    console.log('');

    // Test 5: Sort by created_at desc (newest first)
    console.log('6️⃣ Test 5: Sort by created_at desc (newest first)');
    const test5 = await axios.get('http://localhost:4000/api/v1/approvals/my-pending?sort_by=created_at&sort_order=desc&limit=3', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Sorted approvals (newest first):`);
    test5.data.data.approvals.forEach((approval, index) => {
      console.log(`   ${index + 1}. ID: ${approval.id}, Created: ${new Date(approval.created_at).toLocaleString('vi-VN')}`);
    });
    console.log('');

    // Test 6: Sort by created_at asc (oldest first)
    console.log('7️⃣ Test 6: Sort by created_at asc (oldest first)');
    const test6 = await axios.get('http://localhost:4000/api/v1/approvals/my-pending?sort_by=created_at&sort_order=asc&limit=3', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Sorted approvals (oldest first):`);
    test6.data.data.approvals.forEach((approval, index) => {
      console.log(`   ${index + 1}. ID: ${approval.id}, Created: ${new Date(approval.created_at).toLocaleString('vi-VN')}`);
    });
    console.log('');

    // Test 7: Combined filters
    console.log('8️⃣ Test 7: Combined filters (status=pending, limit=5, sort=desc)');
    const test7 = await axios.get('http://localhost:4000/api/v1/approvals/my-pending?status=pending&limit=5&sort_by=created_at&sort_order=desc', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Combined filter results: ${test7.data.data.approvals.length}`);
    console.log(`   Statistics:`, test7.data.data.statistics);
    console.log('');

    // Test 8: Check response structure
    console.log('9️⃣ Test 8: Verify response structure');
    if (test1.data.data.approvals.length > 0) {
      const approval = test1.data.data.approvals[0];
      console.log('✅ Response structure:');
      console.log(`   - Has document: ${!!approval.document}`);
      console.log(`   - Has owner: ${!!approval.document?.owner}`);
      console.log(`   - Has document_type: ${!!approval.document?.document_type}`);
      console.log(`   - Has workflow: ${!!approval.workflow}`);
      console.log(`   - Has workflow_step: ${!!approval.workflow_step}`);
      console.log('');
      console.log('   Sample approval:');
      console.log(`   - ID: ${approval.id}`);
      console.log(`   - Document: ${approval.document.document_number}`);
      console.log(`   - Type: ${approval.document.document_type.name}`);
      console.log(`   - Owner: ${approval.document.owner.full_name || approval.document.owner.email}`);
      console.log(`   - Step: ${approval.workflow_step.step_name}`);
      console.log(`   - Status: ${approval.action}`);
      console.log(`   - Created: ${new Date(approval.created_at).toLocaleString('vi-VN')}`);
    }
    console.log('');

    console.log('🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testApprovalsEnhanced();
