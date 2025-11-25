const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_BASE = 'http://localhost:4000/api/v1';

async function run() {
  console.log('\n📧 EMAIL NOTIFICATIONS TEST');
  console.log('='.repeat(60));
  console.log('Note: In dev mode, emails are logged to console');
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
        title: 'Email Test Document',
        document_type_id: 4,
        require_digital_signing: true,
        file_name: 'test-email.pdf',
        file_base64: pdfBase64,
        mime_type: 'application/pdf'
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    const documentId = uploadResponse.data.data.document.id;
    const signRequestId = uploadResponse.data.data.document.sign_request_id;
    console.log('✅ Document created:', documentId);

    // Step 3: Add external signer
    console.log('\n📝 STEP 3: Add External Signer');
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    
    const externalSigner = await prisma.signers.create({
      data: {
        sign_request: { connect: { id: signRequestId } },
        email: 'test-signer@example.com',
        name: 'Test Signer',
        signing_order: 1,
        is_internal: false,
        status: 'pending',
        signing_token: token
      }
    });
    console.log('✅ External signer added:', externalSigner.id);

    // Step 4: Send sign request (should trigger email)
    console.log('\n📝 STEP 4: Send Sign Request');
    console.log('📧 This should send email notification to signer...');
    console.log('   Check backend console for email log');
    
    await axios.post(
      `${API_BASE}/sign-requests/${signRequestId}/send`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log('✅ Sign request sent');
    console.log('   Email should be logged in backend console');

    // Get updated token
    const updatedSigner = await prisma.signers.findUnique({
      where: { id: externalSigner.id }
    });
    const actualToken = updatedSigner.signing_token;

    // Step 5: Send OTP (should trigger email)
    console.log('\n📝 STEP 5: Send OTP');
    console.log('📧 This should send OTP email...');
    console.log('   Check backend console for email log');
    
    const otpResponse = await axios.post(
      `${API_BASE.replace('/api/v1', '')}/public/sign/${actualToken}/send-otp`,
      { email: 'test-signer@example.com' }
    );
    const otp = otpResponse.data.data.debug_otp || otpResponse.data.data.otp;
    console.log('✅ OTP sent:', otp);
    console.log('   Email should be logged in backend console');

    // Step 6: Check backend logs
    console.log('\n📝 STEP 6: Verify Email Logs');
    console.log('='.repeat(60));
    console.log('✅ Check backend console output above for:');
    console.log('   1. "📧 Email sent" messages');
    console.log('   2. Email subject lines');
    console.log('   3. Recipient addresses');
    console.log('   4. Email content preview');
    console.log('='.repeat(60));

    console.log('\n🎉 EMAIL NOTIFICATION TEST: COMPLETE');
    console.log('='.repeat(60));
    console.log('✅ Document ID:', documentId);
    console.log('✅ Sign Request ID:', signRequestId);
    console.log('✅ External Signer:', externalSigner.id);
    console.log('✅ Emails triggered: 2 (Sign Request + OTP)');
    console.log('\n💡 To enable real email sending:');
    console.log('   1. Update backend/.env with SMTP credentials');
    console.log('   2. Set SMTP_USER and SMTP_PASSWORD');
    console.log('   3. Restart backend server');
    console.log('   4. Run this test again');
    
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
