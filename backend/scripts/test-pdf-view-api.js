/**
 * Test PDF view API endpoint
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testPDFViewAPI() {
  console.log('🧪 Testing PDF View API...\n');

  try {
    // Login first
    console.log('1️⃣ Logging in...');
    const loginRes = await axios.post('http://localhost:4000/api/v1/auth/login', {
      email: 'admin@acme.local',
      password: 'password123'
    });

    const token = loginRes.data.data.tokens.accessToken;
    console.log('✅ Logged in successfully\n');

    // Get latest document
    console.log('2️⃣ Getting latest document...');
    const docsRes = await axios.get('http://localhost:4000/api/v1/documents', {
      headers: { Authorization: `Bearer ${token}` }
    });

    let docs = docsRes.data.data.documents || docsRes.data.data;
    
    if (!docs || docs.length === 0) {
      console.log('❌ No documents found');
      return;
    }

    const doc = docs[0];
    console.log(`✅ Found document ID: ${doc.id}`);
    console.log(`   Number: ${doc.document_number}`);
    console.log(`   Original Name: ${doc.original_file_name}`);
    console.log('');

    // Test view endpoint
    console.log('3️⃣ Testing view endpoint...');
    console.log(`   URL: http://localhost:4000/api/v1/documents/${doc.id}/view`);
    
    try {
      const viewRes = await axios.get(`http://localhost:4000/api/v1/documents/${doc.id}/view`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'arraybuffer'
      });

      console.log(`✅ View endpoint SUCCESS!`);
      console.log(`   Status: ${viewRes.status}`);
      console.log(`   Content-Type: ${viewRes.headers['content-type']}`);
      console.log(`   Content-Length: ${viewRes.headers['content-length']} bytes`);
      console.log(`   File Size: ${(viewRes.data.length / 1024).toFixed(2)} KB`);
      
      // Save to test file
      const testFile = path.join(__dirname, 'test-output', `viewed-doc-${doc.id}.pdf`);
      fs.mkdirSync(path.dirname(testFile), { recursive: true });
      fs.writeFileSync(testFile, viewRes.data);
      console.log(`   ✅ Saved to: ${testFile}`);
      
    } catch (error) {
      console.log(`❌ View endpoint FAILED!`);
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
    }
    console.log('');

    // Test download endpoint
    console.log('4️⃣ Testing download endpoint...');
    console.log(`   URL: http://localhost:4000/api/v1/documents/${doc.id}/download`);
    
    try {
      const downloadRes = await axios.get(`http://localhost:4000/api/v1/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'arraybuffer'
      });

      console.log(`✅ Download endpoint SUCCESS!`);
      console.log(`   Status: ${downloadRes.status}`);
      console.log(`   Content-Type: ${downloadRes.headers['content-type']}`);
      console.log(`   Content-Disposition: ${downloadRes.headers['content-disposition']}`);
      console.log(`   File Size: ${(downloadRes.data.length / 1024).toFixed(2)} KB`);
      
      // Save to test file
      const testFile = path.join(__dirname, 'test-output', `downloaded-doc-${doc.id}.pdf`);
      fs.writeFileSync(testFile, downloadRes.data);
      console.log(`   ✅ Saved to: ${testFile}`);
      
    } catch (error) {
      console.log(`❌ Download endpoint FAILED!`);
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

testPDFViewAPI();
