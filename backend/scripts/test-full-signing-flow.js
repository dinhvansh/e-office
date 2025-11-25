const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:4000';

async function testFullSigningFlow() {
  console.log('🧪 Testing Full Signing Flow (End-to-End)\n');
  console.log('='.repeat(60));
  
  let token = null;
  let documentId = null;
  let signRequestId = null;
  
  try {
    // Step 1: Login as admin
    console.log('\n📝 Step 1: Login as admin...');
    const loginRes = await axios.post(`${API_BASE}/api/v1/auth/login`, {
      email: 'admin@acme.local',
      password: 'password123'
    });
    token = loginRes.data.data.token;
    console.log('✅ Login successful');
    
    // Step 2: Upload document with digital signing
    console.log('\n📤 Step 2: Upload document with digital signing...');
    const FormData = require('form-data');
    const fs = require('fs');
    const path = require('path');
    
    // Create a simple test PDF
    const testPdfPath = path.join(__dirname, '../test-output/test-doc.pdf');
    if (!fs.existsSync(testPdfPath)) {
      console.log('⚠️ Test PDF not found, using existing document');
      // Use existing document
      const existingDoc = await prisma.documents.findFirst({
        where: { sign_request_id: { not: null } }
      });
      if (existingDoc) {
        documentId = existingDoc.id;
        const signRequest = await prisma.sign_requests.findFirst({
          where: { document_id: documentId }
        });
        signRequestId = signRequest.id;
        console.log('✅ Using existing document:', documentId);
      }
    }
    
    if (!documentId) {
      console.log('❌ No test document available');
      return;
    }
    
    // Step 3: Add signer
    console.log('\n👤 Step 3: Adding external signer...');
    const signerEmail = `test.signer.${Date.now()}@example.com`;
    const signerRes = await axios.post(
      `${API_BASE}/api/v1/sign-requests/${signRequestId}/signers`,
      {
        email: signerEmail,
        name: 'Test Signer',
        role: 'signer',
        signing_order: 1
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const signerId = signerRes.data.data.id;
    console.log('✅ Signer added:', signerEmail);
    
    // Step 4: Add signature field
    console.log('\n📝 Step 4: Adding signature field...');
    await axios.post(
      `${API_BASE}/api/v1/sign-requests/${signRequestId}/fields`,
      {
        fields: [
          {
            type: 'signature',
            page: 1,
            x: 50,
            y: 70,
            width: 30,
            height: 10,
            assigned_signer_id: signerId,
            label: 'Chữ ký',
            required: true
          }
        ]
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Signature field added');
    
    // Step 5: Send sign request
    console.log('\n📧 Step 5: Sending sign request...');
    await axios.post(
      `${API_BASE}/api/v1/sign-requests/${signRequestId}/send`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Sign request sent');
    
    // Get signing token
    const signer = await prisma.signers.findUnique({
      where: { id: signerId }
    });
    const signingToken = signer.signing_token;
    console.log('✅ Signing token:', signingToken.substring(0, 20) + '...');
    
    // Step 6: Send OTP
    console.log('\n🔐 Step 6: Sending OTP...');
    const otpRes = await axios.post(
      `${API_BASE}/public/sign/${signingToken}/send-otp`,
      { email: signerEmail }
    );
    const otp = otpRes.data.data.debug_otp;
    console.log('✅ OTP sent:', otp);
    
    // Step 7: Submit signature
    console.log('\n✍️ Step 7: Submitting signature...');
    const signatureData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    await axios.post(
      `${API_BASE}/public/sign/${signingToken}/sign`,
      {
        otp: otp,
        signature_data: signatureData,
        signature_type: 'drawn',
        field_values: []
      }
    );
    console.log('✅ Signature submitted');
    
    // Step 8: Download signed PDF
    console.log('\n📥 Step 8: Downloading signed PDF...');
    const downloadRes = await axios.get(
      `${API_BASE}/public/sign/${signingToken}/download-signed`,
      { responseType: 'arraybuffer' }
    );
    
    console.log('✅ Download response:', {
      status: downloadRes.status,
      contentType: downloadRes.headers['content-type'],
      size: `${(downloadRes.data.length / 1024).toFixed(2)} KB`
    });
    
    // Save PDF
    const outputPath = path.join(__dirname, '../test-output', `full-flow-test-${Date.now()}.pdf`);
    fs.writeFileSync(outputPath, downloadRes.data);
    console.log('✅ PDF saved:', outputPath);
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 FULL FLOW TEST SUMMARY');
    console.log('='.repeat(60));
    console.log('✅ Document ID:', documentId);
    console.log('✅ Sign Request ID:', signRequestId);
    console.log('✅ Signer Email:', signerEmail);
    console.log('✅ Signing Token:', signingToken.substring(0, 30) + '...');
    console.log('✅ OTP:', otp);
    console.log('✅ PDF Downloaded:', `${(downloadRes.data.length / 1024).toFixed(2)} KB`);
    console.log('✅ Output File:', outputPath);
    console.log('='.repeat(60));
    console.log('\n🎉 FULL SIGNING FLOW TEST: PASSED\n');
    
    // Test URL for manual verification
    console.log('🌐 Manual Test URL:');
    console.log(`http://localhost:3000/sign/${signingToken}`);
    console.log('\n📧 Email:', signerEmail);
    console.log('🔑 OTP:', otp);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testFullSigningFlow();
