const fetch = require('node-fetch');

async function testDocumentView() {
  try {
    // Login first
    const loginRes = await fetch('http://localhost:4000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@acme.local',
        password: 'Admin123'
      })
    });

    const loginData = await loginRes.json();
    console.log('Login response:', loginData.success ? 'Success' : 'Failed');

    if (!loginData.success) {
      console.error('Login failed:', loginData);
      return;
    }

    const token = loginData.token;

    // Check if document 74 exists
    console.log('\n--- Checking document 74 ---');
    const docRes = await fetch('http://localhost:4000/documents/74', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Document fetch status:', docRes.status);
    
    if (docRes.ok) {
      const docData = await docRes.json();
      console.log('Document data:', JSON.stringify(docData, null, 2));
    } else {
      const errorText = await docRes.text();
      console.error('Document fetch error:', errorText);
    }

    // Try to view document
    console.log('\n--- Trying to view document 74 ---');
    const viewRes = await fetch('http://localhost:4000/documents/74/view', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('View status:', viewRes.status);
    console.log('View headers:', viewRes.headers.raw());

    if (viewRes.ok) {
      const contentType = viewRes.headers.get('content-type');
      console.log('Content-Type:', contentType);
      
      const buffer = await viewRes.buffer();
      console.log('File size:', buffer.length, 'bytes');
    } else {
      const errorText = await viewRes.text();
      console.error('View error:', errorText);
    }

  } catch (error) {
    console.error('Test error:', error);
  }
}

testDocumentView();
