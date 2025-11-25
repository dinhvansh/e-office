/**
 * Test: Approver viewing document PDF
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:4000/api/v1';

async function testApprovalViewPDF() {
  try {
    console.log('🧪 Testing approver viewing document PDF...\n');

    // Step 1: Login as approver
    console.log('1️⃣ Login as approver...');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'approver@acme.local',
        password: 'password123'
      })
    });

    const loginData = await loginRes.json();
    if (!loginData.success) {
      throw new Error('Login failed: ' + JSON.stringify(loginData));
    }

    const token = loginData.data.tokens.accessToken;
    console.log('✅ Logged in');
    console.log('   Token:', token.substring(0, 30) + '...\n');

    // Step 2: Get approval detail
    console.log('2️⃣ Get approval detail...');
    const approvalRes = await fetch(`${API_BASE}/approvals/33`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const approvalData = await approvalRes.json();
    if (!approvalData.success) {
      throw new Error('Get approval failed: ' + JSON.stringify(approvalData));
    }

    const documentId = approvalData.data.document.id;
    console.log('✅ Approval found');
    console.log('   Document ID:', documentId);
    console.log('   Document title:', approvalData.data.document.title);
    console.log('   Approver:', approvalData.data.approver.email, '\n');

    // Step 3: Try to view PDF
    console.log('3️⃣ Try to view PDF...');
    const viewRes = await fetch(`${API_BASE}/documents/${documentId}/view`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('   Response status:', viewRes.status, viewRes.statusText);
    console.log('   Content-Type:', viewRes.headers.get('content-type'));

    if (viewRes.status === 200) {
      const buffer = await viewRes.buffer();
      console.log('✅ PDF loaded successfully!');
      console.log('   Size:', buffer.length, 'bytes');
      
      // Check if it's a valid PDF
      const header = buffer.toString('utf8', 0, 5);
      if (header === '%PDF-') {
        console.log('✅ Valid PDF format');
      } else {
        console.log('⚠️ Not a valid PDF (header:', header, ')');
      }
    } else {
      const errorText = await viewRes.text();
      console.log('❌ Failed to load PDF');
      console.log('   Error:', errorText);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

testApprovalViewPDF();
