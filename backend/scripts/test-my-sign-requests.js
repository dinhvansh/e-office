const axios = require('axios');

const API_BASE = 'http://localhost:4000/api/v1';

async function testMySignRequests() {
  try {
    console.log('🧪 Testing My Sign Requests API\n');

    // Step 1: Login as admin
    console.log('1️⃣ Login as admin...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@acme.local',
      password: 'password123'
    });
    
    const token = loginRes.data.data.tokens.accessToken;
    console.log('✅ Login successful\n');

    // Step 2: Get all my sign requests
    console.log('2️⃣ Get all my sign requests...');
    const allRes = await axios.get(`${API_BASE}/sign-requests/my-requests`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const allRequests = allRes.data.data.sign_requests;
    console.log(`✅ Found ${allRequests.length} sign requests\n`);

    if (allRequests.length > 0) {
      const first = allRequests[0];
      console.log('📋 First sign request:');
      console.log(`   ID: ${first.id}`);
      console.log(`   Status: ${first.status}`);
      console.log(`   Document: ${first.document.title || first.document.original_file_name}`);
      console.log(`   Document Number: ${first.document.document_number || 'N/A'}`);
      console.log(`   Owner: ${first.document.owner.full_name || first.document.owner.email}`);
      console.log(`   Created: ${new Date(first.created_at).toLocaleDateString('vi-VN')}`);
      console.log(`   Progress: ${first.progress.signed}/${first.progress.total} (${first.progress.percentage}%)`);
      console.log(`   Signers:`);
      first.signers.forEach((signer, idx) => {
        console.log(`     ${idx + 1}. ${signer.name} (${signer.email}) - ${signer.status}`);
      });
      console.log('');
    }

    // Step 3: Filter by status
    console.log('3️⃣ Filter by status = pending...');
    const pendingRes = await axios.get(`${API_BASE}/sign-requests/my-requests?status=pending`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const pendingRequests = pendingRes.data.data.sign_requests;
    console.log(`✅ Found ${pendingRequests.length} pending sign requests\n`);

    // Step 4: Filter by status = completed
    console.log('4️⃣ Filter by status = completed...');
    const completedRes = await axios.get(`${API_BASE}/sign-requests/my-requests?status=completed`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const completedRequests = completedRes.data.data.sign_requests;
    console.log(`✅ Found ${completedRequests.length} completed sign requests\n`);

    // Summary
    console.log('📊 Summary:');
    console.log(`   Total: ${allRequests.length}`);
    console.log(`   Pending: ${pendingRequests.length}`);
    console.log(`   Completed: ${completedRequests.length}`);
    console.log(`   In Progress: ${allRequests.filter(r => r.status === 'in_progress').length}`);
    console.log(`   Draft: ${allRequests.filter(r => r.status === 'draft').length}`);
    console.log(`   Cancelled: ${allRequests.filter(r => r.status === 'cancelled').length}`);
    
    console.log('\n✅ All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

testMySignRequests();
