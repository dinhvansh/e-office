const fetch = require('node-fetch');

async function testDocumentView() {
  try {
    console.log('=== Testing Document View Endpoint ===\n');

    // 1. Login to get real token
    console.log('1. Logging in...');
    const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@acme.local',
        password: 'admin123'
      })
    });

    const loginData = await loginRes.json();
    console.log('Login response:', JSON.stringify(loginData, null, 2));
    
    if (!loginData.success) {
      console.error('❌ Login failed:', loginData);
      return;
    }

    const token = loginData.data?.tokens?.accessToken || loginData.data?.token || loginData.token;
    console.log('✅ Login successful');
    if (token) {
      console.log('Token:', token.substring(0, 50) + '...\n');
    } else {
      console.log('Token:', token, '\n');
    }

    // 2. Test with Authorization header
    console.log('2. Testing with Authorization header...');
    const headerRes = await fetch('http://localhost:4000/api/v1/documents/74/view', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Status:', headerRes.status);
    console.log('Content-Type:', headerRes.headers.get('content-type'));
    
    if (headerRes.ok) {
      console.log('✅ Authorization header works!');
      const buffer = await headerRes.buffer();
      console.log('File size:', buffer.length, 'bytes\n');
    } else {
      console.error('❌ Failed with header');
      const text = await headerRes.text();
      console.error('Error:', text.substring(0, 200), '\n');
    }

    // 3. Test with query string token
    console.log('3. Testing with query string token...');
    const queryRes = await fetch(`http://localhost:4000/api/v1/documents/74/view?token=${token}`);

    console.log('Status:', queryRes.status);
    console.log('Content-Type:', queryRes.headers.get('content-type'));
    
    if (queryRes.ok) {
      console.log('✅ Query string token works!');
      const buffer = await queryRes.buffer();
      console.log('File size:', buffer.length, 'bytes');
    } else {
      console.error('❌ Failed with query string');
      const text = await queryRes.text();
      console.error('Error:', text.substring(0, 200));
    }

  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testDocumentView();
