const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

async function testViewSigned() {
  try {
    // Login first
    const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@acme.local',
        password: 'admin123'
      })
    });
    
    const loginData = await loginRes.json();
    const token = loginData.data.tokens.accessToken;
    
    console.log('✅ Logged in successfully\n');
    
    // Test view-signed endpoint
    console.log('🔍 Testing /documents/82/view-signed endpoint...\n');
    
    const viewRes = await fetch('http://localhost:4000/api/v1/documents/82/view-signed', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Status:', viewRes.status);
    console.log('Content-Type:', viewRes.headers.get('content-type'));
    console.log('Content-Disposition:', viewRes.headers.get('content-disposition'));
    console.log('Cache-Control:', viewRes.headers.get('cache-control'));
    
    if (viewRes.status === 200) {
      const buffer = await viewRes.buffer();
      console.log('File size:', buffer.length, 'bytes');
      
      // Save to test file
      const testFile = path.join(__dirname, '../test-view-signed-82.pdf');
      fs.writeFileSync(testFile, buffer);
      console.log('✅ Saved to:', testFile);
    } else {
      const text = await viewRes.text();
      console.log('Error response:', text);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testViewSigned();
