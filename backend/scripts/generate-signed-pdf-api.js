const axios = require('axios');

const API_URL = 'http://localhost:4000/api/v1';
const ADMIN_EMAIL = 'admin@acme.local';
const ADMIN_PASSWORD = 'Admin@123';

async function generateSignedPDF() {
  console.log('\n📄 Generating Signed PDF via API...\n');
  
  try {
    // Login
    console.log('🔐 Logging in...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    const token = loginRes.data.data.token;
    console.log('✅ Logged in');

    // Get document 133
    console.log('\n📋 Getting document 133...');
    const docRes = await axios.get(`${API_URL}/documents/133`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const document = docRes.data.data.document;
    console.log('Document:', document.title);
    console.log('Status:', document.status);
    console.log('Sign Request ID:', document.sign_request_id);
    console.log('Signed File Path:', document.signed_file_path || 'Not generated');

    if (!document.sign_request_id) {
      console.log('❌ No sign request for this document');
      return;
    }

    // Download signed PDF (this will trigger generation if not exists)
    console.log('\n📥 Downloading signed PDF...');
    const downloadUrl = `http://localhost:4000/public/sign/${document.sign_request_id}/download-signed`;
    
    // Get a signer token first
    const signRequestRes = await axios.get(`${API_URL}/sign-requests/${document.sign_request_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const signers = signRequestRes.data.data.sign_request.signers;
    console.log('Signers:', signers.map(s => ({ name: s.name, status: s.status, token: s.signing_token ? 'Yes' : 'No' })));
    
    const signerWithToken = signers.find(s => s.signing_token);
    if (!signerWithToken) {
      console.log('❌ No signer with token found');
      return;
    }

    console.log(`\n📥 Downloading via token: ${signerWithToken.signing_token.substring(0, 20)}...`);
    const pdfUrl = `http://localhost:4000/public/sign/${signerWithToken.signing_token}/download-signed`;
    
    const pdfRes = await axios.get(pdfUrl, {
      responseType: 'arraybuffer'
    });
    
    console.log('✅ PDF downloaded, size:', pdfRes.data.length, 'bytes');
    console.log('✅ Content-Type:', pdfRes.headers['content-type']);
    
    // Save to file
    const fs = require('fs');
    const outputPath = `test-output/document-133-signed.pdf`;
    fs.writeFileSync(outputPath, pdfRes.data);
    console.log(`💾 Saved to: ${outputPath}`);
    
    console.log('\n🎉 Done! Check the file and refresh the Flow page.');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

generateSignedPDF();
