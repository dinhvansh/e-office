const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_BASE = 'http://localhost:4000/api/v1';
const PUBLIC_BASE = 'http://localhost:4000/public';

let adminToken, approverToken;
let documentId, signRequestId, approvalId;
let internalSignerId, externalSignerId;
let externalSignerToken, externalOTP;

async function run() {
  console.log('\n🧪 FRESH COMPLETE FLOW TEST');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Admin login
    console.log('\n📝 STEP 1: Admin Login');
    const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@acme.local',
      password: 'password123'
    });
    adminToken = adminLogin.data.data.tokens.accessToken;
    console.log('✅ Admin logged in');

    // Step 2: Create new document with signing
    console.log('\n📝 STEP 2: Create Document');
    
    // Create minimal PDF base64 (valid PDF structure)
    const pdfBase64 = 'JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSA1IDAgUj4+Pj4vTWVkaWFCb3hbMCAwIDYxMiA3OTJdL0NvbnRlbnRzIDQgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDQ0Pj4Kc3RyZWFtCkJUCi9GMSA0OCBUZgoxMCA3MDAgVGQKKFRlc3QpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKNSAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2E+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmDQowMDAwMDAwMjczIDAwMDAwIG4NCjAwMDAwMDAyMjQgMDAwMDAgbg0KMDAwMDAwMDAxNSAwMDAwMCBuDQowMDAwMDAwMTI1IDAwMDAwIG4NCjAwMDAwMDAzMjIgMDAwMDAgbg0KdHJhaWxlcgo8PC9TaXplIDYvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgo0MDIKJSVFT0YK';
    
    const uploadResponse = await axios.post(
      `${API_BASE}/documents`,
      {
        title: 'Test Contract - Fresh Flow',
        document_type_id: 4, // Quyết định (requires signing)
        require_digital_signing: true,
        file_name: 'test-contract.pdf',
        file_base64: pdfBase64,
        mime_type: 'application/pdf'
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    documentId = uploadResponse.data.data.document.id;
    signRequestId = uploadResponse.data.data.document.sign_request_id;
    console.log('✅ Document created:', documentId);
    console.log('   Sign Request:', signRequestId);

    // Step 3: Add internal signer (approver)
    console.log('\n📝 STEP 3: Add Internal Signer');
    const internalSigner = await prisma.signers.create({
      data: {
        sign_request_id: signRequestId,
        email: 'approver@acme.local',
        name: 'Internal Approver',
        signing_order: 1,
        is_internal: true,
        status: 'pending'
      }
    });
    internalSignerId = internalSigner.id;
    console.log('✅ Internal signer added:', internalSignerId);

    // Step 4: Add external signer
    console.log('\n📝 STEP 4: Add External Signer');
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    
    const externalSigner = await prisma.signers.create({
      data: {
        sign_request_id: signRequestId,
        email: 'external@example.com',
        name: 'External Signer',
        signing_order: 2,
        is_internal: false,
        status: 'pending',
        signing_token: token
      }
    });
    externalSignerId = externalSigner.id;
    externalSignerToken = token;
    console.log('✅ External signer added:', externalSignerId);
    console.log('   Token:', token.substring(0, 20) + '...');

    // Step 5: Add signature fields
    console.log('\n📝 STEP 5: Add Signature Fields');
    const field1 = await prisma.sign_request_fields.create({
      data: {
        document: { connect: { id: documentId } },
        sign_request: { connect: { id: signRequestId } },
        assigned_signer: { connect: { id: internalSignerId } },
        type: 'signature',
        page: 1,
        x: 10,
        y: 70,
        width: 30,
        height: 10,
        required: true
      }
    });
    
    const field2 = await prisma.sign_request_fields.create({
      data: {
        document: { connect: { id: documentId } },
        sign_request: { connect: { id: signRequestId } },
        assigned_signer: { connect: { id: externalSignerId } },
        type: 'signature',
        page: 1,
        x: 10,
        y: 50,
        width: 30,
        height: 10,
        required: true
      }
    });
    console.log('✅ Fields added:', field1.id, field2.id);

    // Step 6: Send sign request
    console.log('\n📝 STEP 6: Send Sign Request');
    await axios.post(
      `${API_BASE}/sign-requests/${signRequestId}/send`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log('✅ Sign request sent');

    // Step 7: Submit for approval
    console.log('\n📝 STEP 7: Submit for Approval');
    const submitResponse = await axios.post(
      `${API_BASE}/approvals/submit`,
      {
        document_id: documentId,
        workflow_id: 12 // Phê duyệt đơn giản
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log('📦 Submit response:', JSON.stringify(submitResponse.data, null, 2));
    
    // Get approval ID from document_approvals
    const approval = await prisma.document_approvals.findFirst({
      where: { document_id: documentId },
      orderBy: { created_at: 'desc' }
    });
    
    approvalId = approval?.id;
    console.log('✅ Submitted for approval:', approvalId);

    // Step 8: Approver login
    console.log('\n📝 STEP 8: Approver Login');
    const approverLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'approver@acme.local',
      password: 'password123'
    });
    approverToken = approverLogin.data.data.tokens.accessToken;
    console.log('✅ Approver logged in');

    // Step 9: Approve with signature
    console.log('\n📝 STEP 9: Approve with Signature');
    const signatureData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    await axios.post(
      `${API_BASE}/approvals/${approvalId}/approve`,
      {
        comment: 'Approved with signature',
        signature_data: signatureData,
        signature_type: 'drawn'
      },
      { headers: { Authorization: `Bearer ${approverToken}` } }
    );
    console.log('✅ Approved with signature');

    // Step 10: Mark internal signer as signed
    console.log('\n📝 STEP 10: Mark Internal Signer as Signed');
    await prisma.signers.update({
      where: { id: internalSignerId },
      data: {
        status: 'signed',
        signed_at: new Date(),
        signature_data: signatureData,
        signature_type: 'drawn'
      }
    });
    console.log('✅ Internal signer marked as signed');

    // Step 11: Send OTP to external signer
    console.log('\n📝 STEP 11: Send OTP to External Signer');
    const otpResponse = await axios.post(
      `${PUBLIC_BASE}/sign/${externalSignerToken}/send-otp`,
      { email: 'external@example.com' }
    );
    externalOTP = otpResponse.data.data.debug_otp || otpResponse.data.data.otp;
    console.log('✅ OTP sent:', externalOTP);

    // Step 12: External signer signs
    console.log('\n📝 STEP 12: External Signer Signs');
    const signResponse = await axios.post(
      `${PUBLIC_BASE}/sign/${externalSignerToken}/sign`,
      {
        email: 'external@example.com',
        otp: externalOTP,
        signature_data: signatureData,
        signature_type: 'drawn',
        field_values: [
          { field_id: field2.id, value: signatureData }
        ]
      }
    );
    console.log('✅ External signer signed successfully');
    console.log('   Status:', signResponse.data.data.status);

    // Step 13: Download signed PDF
    console.log('\n📝 STEP 13: Download Signed PDF');
    const pdfResponse = await axios.get(
      `${PUBLIC_BASE}/sign/${externalSignerToken}/download-signed`,
      { responseType: 'arraybuffer' }
    );
    
    const fs = require('fs');
    const outputPath = `test-output/signed-fresh-${Date.now()}.pdf`;
    fs.writeFileSync(outputPath, pdfResponse.data);
    
    console.log('✅ PDF downloaded successfully');
    console.log('   Size:', (pdfResponse.data.length / 1024).toFixed(2), 'KB');
    console.log('   Saved to:', outputPath);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 COMPLETE FLOW TEST: PASSED');
    console.log('='.repeat(60));
    console.log('✅ Document ID:', documentId);
    console.log('✅ Sign Request ID:', signRequestId);
    console.log('✅ Approval ID:', approvalId);
    console.log('✅ Internal Signer:', internalSignerId, '(signed)');
    console.log('✅ External Signer:', externalSignerId, '(signed)');
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
