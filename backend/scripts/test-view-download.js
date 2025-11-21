const fs = require('fs');

const BASE_URL = 'http://localhost:4000/api/v1';

async function login() {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@acme.local',
      password: 'password123',
    }),
  });
  const data = await response.json();
  
  if (!response.ok || !data.success) {
    console.error('Login response:', JSON.stringify(data, null, 2));
    throw new Error(data.error?.message || 'Login failed');
  }
  
  return data.data.tokens.accessToken;
}

async function testViewDownload() {
  try {
    console.log('🔐 Logging in...');
    const token = await login();
    console.log('✅ Login successful\n');

    // Test with document ID 13 (just uploaded)
    const docId = 13;

    console.log(`📄 Testing View Document ${docId}...`);
    try {
      const viewResponse = await fetch(`${BASE_URL}/documents/${docId}/view`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!viewResponse.ok) {
        const error = await viewResponse.json();
        throw new Error(error.error?.message || 'View failed');
      }
      
      const buffer = await viewResponse.arrayBuffer();
      console.log(`✅ View successful!`);
      console.log(`   Content-Type: ${viewResponse.headers.get('content-type')}`);
      console.log(`   Content-Length: ${buffer.byteLength} bytes`);
      
      // Save to file for verification
      fs.writeFileSync('test-view-output.pdf', Buffer.from(buffer));
      console.log(`   Saved to: test-view-output.pdf\n`);
    } catch (error) {
      console.log(`❌ View failed: ${error.message}\n`);
    }

    console.log(`⬇️  Testing Download Document ${docId}...`);
    try {
      const downloadResponse = await fetch(`${BASE_URL}/documents/${docId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!downloadResponse.ok) {
        const error = await downloadResponse.json();
        throw new Error(error.error?.message || 'Download failed');
      }
      
      const buffer = await downloadResponse.arrayBuffer();
      console.log(`✅ Download successful!`);
      console.log(`   Content-Type: ${downloadResponse.headers.get('content-type')}`);
      console.log(`   Content-Disposition: ${downloadResponse.headers.get('content-disposition')}`);
      console.log(`   Content-Length: ${buffer.byteLength} bytes`);
      
      // Save to file for verification
      fs.writeFileSync('test-download-output.pdf', Buffer.from(buffer));
      console.log(`   Saved to: test-download-output.pdf\n`);
    } catch (error) {
      console.log(`❌ Download failed: ${error.message}\n`);
    }

    console.log('🎉 Test complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testViewDownload();
