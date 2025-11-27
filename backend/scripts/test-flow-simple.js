// Simple test for unified flow endpoint
const axios = require('axios');

const API_BASE = 'http://localhost:4000/api/v1';

async function testFlow() {
  console.log('🧪 Testing Unified Flow Endpoint (Simple)\n');

  try {
    // 1. Login
    console.log('1️⃣ Login...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@acme.local',
      password: 'password123',
    });

    const token = loginRes.data.data.tokens.accessToken;
    console.log('✅ Login OK\n');

    // 2. Test with document ID 101 (from previous sessions)
    const docId = 101;
    console.log(`2️⃣ Testing flow for document ${docId}...`);

    const flowRes = await axios.get(
      `${API_BASE}/documents/${docId}/flow`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log('✅ API Response OK!\n');

    const data = flowRes.data.data;

    // 3. Display results
    console.log('📊 Response Data:');
    console.log(`   Document: ${data.document?.title || 'N/A'}`);
    console.log(`   Status: ${data.document?.status || 'N/A'}`);
    console.log(`   Phases: ${data.phases?.length || 0}`);
    console.log(`   Steps: ${data.steps?.length || 0}`);
    console.log(`   Activities: ${data.activities?.length || 0}`);
    console.log(`   Can Approve: ${data.can_approve}`);
    console.log(`   Can Sign: ${data.can_sign}\n`);

    if (data.phases && data.phases.length > 0) {
      console.log('📋 Phases:');
      data.phases.forEach((p) => {
        console.log(`   - ${p.label}: ${p.status}`);
      });
      console.log();
    }

    if (data.steps && data.steps.length > 0) {
      console.log('📝 Steps:');
      data.steps.forEach((s) => {
        console.log(`   - ${s.type} (order ${s.order}): ${s.status}`);
        if (s.user) {
          console.log(`     User: ${s.user.name || s.user.email}`);
        }
      });
      console.log();
    }

    console.log('🎉 Backend API Working!\n');
    console.log('✅ READY FOR UI TESTING');
    console.log(`   URL: http://localhost:3000/documents/${docId}/flow\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    
    // Try another document
    if (error.response?.status === 404 || error.response?.status === 403) {
      console.log('\n⚠️ Document 101 not accessible, trying document 1...\n');
      
      try {
        const token = error.config.headers.Authorization.replace('Bearer ', '');
        const flowRes2 = await axios.get(
          `${API_BASE}/documents/1/flow`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        console.log('✅ Document 1 works!\n');
        const data = flowRes2.data.data;
        console.log('📊 Response Data:');
        console.log(JSON.stringify(data, null, 2));
        console.log('\n✅ READY FOR UI TESTING');
        console.log('   URL: http://localhost:3000/documents/1/flow\n');
        
      } catch (err2) {
        console.error('❌ Document 1 also failed:', err2.message);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
}

testFlow();
