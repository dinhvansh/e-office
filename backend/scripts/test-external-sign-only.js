const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_BASE = 'http://localhost:4000/api/v1';
const PUBLIC_BASE = 'http://localhost:4000/public';

async function run() {
  console.log('\n🧪 EXTERNAL SIGNING TEST (NO APPROVAL)');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Admin login
    console.log('\n📝 STEP 1: Admin Login');
    const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@acme.local',
      password: 'password123'
    });
    const adminToken = adminLogin.data.data.tokens.accessToken;
    console.log('✅ Admin logged in');

    // Step 2: Create document
    console.log('\n📝 STEP 2: Create Document');
    const pdfBase64 = 'JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSA1IDAgUj4+Pj4vTWVkaWFCb3hbMCAwIDYxMiA3OTJdL0NvbnRlbnRzIDQgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDQ0Pj4Kc3RyZWFtCkJUCi9GMSA0OCBUZgoxMCA3MDAgVGQKKFRlc3QpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKNSAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2E+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmDQowMDAwMDAwMjczIDAwMDAwIG4NCjAwMDAwMDAyMjQgMDAwMDAgbg0KMDAwMDAwMDAxNSAwMDAwMCBuDQowMDAwMDAwMTI1IDAwMDAwIG4NCjAwMDAwMDAzMjIgMDAwMDAgbg0KdHJhaWxlcgo8PC9TaXplIDYvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgo0MDIKJSVFT0YK';
    
    const uploadResponse = await axios.post(
      `${API_BASE}/documents`,
      {
        title: 'External Sign Test',
        document_type_id: 4,
        require_digital_signing: true,
        file_name: 'test.pdf',
        file_base64: pdfBase64,
        mime_type: 'application/pdf'
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    const documentId = uploadResponse.data.data.document.id;
    const signRequestId = uploadResponse.data.data.document.sign_request_id;
    console.log('✅ Document created:', documentId);
    console.log('   Sign Request:', signRequestId);

    // Step 3: Add external signer
    console.log('\n📝 STEP 3: Add External Signer');
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    
    const externalSigner = await prisma.signers.create({
      data: {
        sign_request: { connect: { id: signRequestId } },
        email: 'external@example.com',
        name: 'External Signer',
        signing_order: 1,
        is_internal: false,
        status: 'pending',
        signing_token: token
      }
    });
    console.log('✅ External signer added:', externalSigner.id);
    console.log('   Token:', token.substring(0, 20) + '...');

    // Step 4: Add signature field
    console.log('\n📝 STEP 4: Add Signature Field');
    const field = await prisma.sign_request_fields.create({
      data: {
        document: { connect: { id: documentId } },
        sign_request: { connect: { id: signRequestId } },
        assigned_signer: { connect: { id: externalSigner.id } },
        type: 'signature',
        page: 1,
        x: 10,
        y: 50,
        width: 30,
        height: 10,
        required: true
      }
    });
    console.log('✅ Field added:', field.id);

    // Step 5: Send sign request
    console.log('\n📝 STEP 5: Send Sign Request');
    await axios.post(
      `${API_BASE}/sign-requests/${signRequestId}/send`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log('✅ Sign request sent');

    // Get updated token after send
    const updatedSigner = await prisma.signers.findUnique({
      where: { id: externalSigner.id }
    });
    const actualToken = updatedSigner.signing_token;
    console.log('   Updated token:', actualToken.substring(0, 20) + '...');

    // Step 6: Send OTP
    console.log('\n📝 STEP 6: Send OTP to External Signer');
    const otpResponse = await axios.post(
      `${PUBLIC_BASE}/sign/${actualToken}/send-otp`,
      { email: 'external@example.com' }
    );
    const otp = otpResponse.data.data.debug_otp || otpResponse.data.data.otp;
    console.log('✅ OTP sent:', otp);

    // Step 7: External signer signs
    console.log('\n📝 STEP 7: External Signer Signs');
    const signatureData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    const signResponse = await axios.post(
      `${PUBLIC_BASE}/sign/${actualToken}/sign`,
      {
        email: 'external@example.com',
        otp: otp,
        signature_data: signatureData,
        signature_type: 'drawn',
        field_values: [
          { field_id: field.id, value: signatureData }
        ]
      }
    );
    console.log('✅ External signer signed successfully');
    console.log('   Status:', signResponse.data.data.status);

    // Step 8: Download signed PDF
    console.log('\n📝 STEP 8: Download Signed PDF');
    const pdfResponse = await axios.get(
      `${PUBLIC_BASE}/sign/${actualToken}/download-signed`,
      { responseType: 'arraybuffer' }
    );
    
    const fs = require('fs');
    const outputPath = `test-output/signed-external-${Date.now()}.pdf`;
    fs.writeFileSync(outputPath, pdfResponse.data);
    
    console.log('✅ PDF downloaded successfully');
    console.log('   Size:', (pdfResponse.data.length / 1024).toFixed(2), 'KB');
    console.log('   Saved to:', outputPath);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 EXTERNAL SIGNING TEST: PASSED');
    console.log('='.repeat(60));
    console.log('✅ Document ID:', documentId);
    console.log('✅ Sign Request ID:', signRequestId);
    console.log('✅ External Signer:', externalSigner.id, '(signed)');
    console.log('✅ PDF Downloaded');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
  } finally {
    await prisma.$disconnect();
  }
}

run();
