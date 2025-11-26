const axios = require('axios');

const API_BASE = 'http://localhost:4000/api/v1';

async function testDocumentsFilter() {
  console.log('🧪 Testing Documents Filter (no_signing_only)\n');

  try {
    // Step 1: Login as admin
    console.log('Step 1: Login as admin...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@acme.local',
      password: 'password123',
    });
    const token = loginRes.data.data.tokens.accessToken;
    console.log('✅ Login successful\n');

    const headers = { Authorization: `Bearer ${token}` };

    // Step 2: Get all documents (no filter)
    console.log('Step 2: Get all documents (no filter)...');
    const allDocsRes = await axios.get(`${API_BASE}/documents`, { headers });
    const allDocs = allDocsRes.data.data.documents;
    console.log(`✅ Total documents: ${allDocs.length}`);
    
    const withSigning = allDocs.filter(d => d.require_digital_signing);
    const withoutSigning = allDocs.filter(d => !d.require_digital_signing);
    console.log(`   - With signing: ${withSigning.length}`);
    console.log(`   - Without signing: ${withoutSigning.length}\n`);

    // Step 3: Get documents with no_signing_only=true
    console.log('Step 3: Get documents with no_signing_only=true...');
    const noSigningRes = await axios.get(`${API_BASE}/documents?no_signing_only=true`, { headers });
    const noSigningDocs = noSigningRes.data.data.documents;
    console.log(`✅ Documents without signing: ${noSigningDocs.length}`);
    
    // Verify all returned documents don't require signing
    const allCorrect = noSigningDocs.every(d => !d.require_digital_signing);
    if (allCorrect) {
      console.log('✅ All documents correctly filtered (require_digital_signing = false)\n');
    } else {
      console.log('❌ ERROR: Some documents still require signing!\n');
      return;
    }

    // Step 4: Test pagination with filter
    console.log('Step 4: Test pagination with no_signing_only...');
    const paginatedRes = await axios.get(`${API_BASE}/documents?page=1&limit=5&no_signing_only=true`, { headers });
    const paginatedDocs = paginatedRes.data.data.documents;
    const pagination = paginatedRes.data.data.pagination;
    
    console.log(`✅ Paginated results: ${paginatedDocs.length} documents`);
    console.log(`   - Page: ${pagination.page}/${pagination.totalPages}`);
    console.log(`   - Total: ${pagination.total}`);
    
    const allPaginatedCorrect = paginatedDocs.every(d => !d.require_digital_signing);
    if (allPaginatedCorrect) {
      console.log('✅ Pagination filter working correctly\n');
    } else {
      console.log('❌ ERROR: Pagination filter not working!\n');
      return;
    }

    // Summary
    console.log('📊 Test Summary:');
    console.log('✅ All tests passed!');
    console.log('✅ Filter working correctly');
    console.log('✅ Pagination working correctly');
    console.log('\n🎉 Documents filter implementation complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testDocumentsFilter();
