/**
 * Test Current System - Find Issues
 */

const API_URL = 'http://localhost:4000/api/v1';

async function main() {
  console.log('🧪 Testing Current System...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Health Check...');
    const healthRes = await fetch('http://localhost:4000/health');
    if (healthRes.ok) {
      console.log('✅ Backend is running');
    } else {
      console.log('❌ Backend health check failed');
    }
  } catch (error) {
    console.log('❌ Backend not accessible:', error.message);
    return;
  }

  try {
    // Test 2: Login
    console.log('\n2️⃣ Login Test...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@acme.local',
        password: 'admin123',
      }),
    });

    const loginData = await loginRes.json();
    console.log('🔍 Login response:', JSON.stringify(loginData, null, 2));
    
    if (loginRes.ok && loginData.success) {
      console.log('✅ Login successful');
      const token = loginData.data.tokens.accessToken;
      console.log('🔑 Token:', token ? 'exists' : 'missing');
      
      // Test 3: Documents API
      console.log('\n3️⃣ Documents API Test...');
      const docsRes = await fetch(`${API_URL}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const docsData = await docsRes.json();
      if (docsRes.ok) {
        console.log(`✅ Documents API working - ${docsData.data?.length || 0} documents`);
      } else {
        console.log('❌ Documents API failed:', docsData);
      }

      // Test 4: Workflows API
      console.log('\n4️⃣ Workflows API Test...');
      const workflowsRes = await fetch(`${API_URL}/workflows`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const workflowsData = await workflowsRes.json();
      if (workflowsRes.ok) {
        console.log(`✅ Workflows API working - ${workflowsData.data?.length || 0} workflows`);
      } else {
        console.log('❌ Workflows API failed:', workflowsData);
      }

      // Test 5: Approvals API
      console.log('\n5️⃣ Approvals API Test...');
      const approvalsRes = await fetch(`${API_URL}/approvals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('Approvals response status:', approvalsRes.status);
      console.log('Approvals response headers:', Object.fromEntries(approvalsRes.headers.entries()));
      
      const approvalsText = await approvalsRes.text();
      console.log('Approvals response (first 200 chars):', approvalsText.substring(0, 200));
      
      try {
        const approvalsData = JSON.parse(approvalsText);
        if (approvalsRes.ok) {
          console.log(`✅ Approvals API working - ${approvalsData.data?.length || 0} approvals`);
        } else {
          console.log('❌ Approvals API failed:', approvalsData);
        }
      } catch (e) {
        console.log('❌ Approvals API returned non-JSON response');
      }

      // Test 6: Sign Requests API
      console.log('\n6️⃣ Sign Requests API Test...');
      const signReqRes = await fetch(`${API_URL}/sign-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const signReqData = await signReqRes.json();
      if (signReqRes.ok) {
        console.log(`✅ Sign Requests API working - ${signReqData.data?.length || 0} sign requests`);
      } else {
        console.log('❌ Sign Requests API failed:', signReqData);
      }

    } else {
      console.log('❌ Login failed:', loginData);
    }

  } catch (error) {
    console.log('❌ API Test failed:', error.message);
  }

  console.log('\n🎯 System Test Complete!');
}

main().catch(console.error);