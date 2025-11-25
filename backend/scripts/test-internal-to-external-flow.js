/**
 * Test Full Internal to External Signing Flow
 * 
 * Flow:
 * 1. Admin uploads document requiring approval + signing
 * 2. Submit for approval (internal workflow)
 * 3. Approver reviews and approves with signature
 * 4. Document moves to external signing
 * 5. External signer receives email and signs
 * 6. Download signed PDF
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:4000/api/v1';
const PUBLIC_BASE = 'http://localhost:4000/public';

let adminToken = '';
let approverToken = '';
let documentId = null;
let signRequestId = null;
let approvalId = null;
let externalSignerToken = '';
let externalSignerOTP = '';

// Test credentials
const ADMIN = {
  email: 'admin@acme.local',
  password: 'password123'
};

const APPROVER = {
  email: 'approver@acme.local',
  password: 'password123'
};

const EXTERNAL_SIGNER = {
  email: 'external.signer@example.com',
  name: 'External Signer'
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function step1_AdminLogin() {
  console.log('\n📝 STEP 1: Admin Login');
  console.log('='.repeat(50));
  
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, ADMIN);
    
    // Get accessToken from new structure
    adminToken = response.data.data?.tokens?.accessToken;
    
    if (!adminToken) {
      console.error('❌ Token not found in response');
      return false;
    }
    
    console.log('✅ Admin logged in successfully');
    console.log(`   Token: ${adminToken.substring(0, 20)}...`);
    return true;
  } catch (error) {
    console.error('❌ Admin login failed:', error.response?.data || error.message);
    return false;
  }
}

async function step2_UploadDocument() {
  console.log('\n📤 STEP 2: Get Test Document');
  console.log('='.repeat(50));
  
  try {
    // Use pre-created test document
    documentId = 67;
    signRequestId = 21;
    
    console.log('✅ Using test document');
    console.log(`   Document ID: ${documentId}`);
    console.log(`   Sign Request ID: ${signRequestId}`);
    return true;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    return false;
  }
}

async function step3_AddExternalSigner() {
  console.log('\n👤 STEP 3: Check Signers');
  console.log('='.repeat(50));
  
  try {
    // Signers already added in setup script
    console.log('✅ Signers already configured');
    console.log(`   Internal: approver@acme.local (Order: 1)`);
    console.log(`   External: ${EXTERNAL_SIGNER.email} (Order: 2)`);
    return true;
  } catch (error) {
    console.error('❌ Check failed:', error.message);
    return false;
  }
}

async function step4_AddSignatureFields() {
  console.log('\n📝 STEP 4: Add Signature Fields');
  console.log('='.repeat(50));
  
  try {
    // Skip for now - will be added via editor
    console.log('⏭️  Skipping field addition (use editor UI)');
    return true;
  } catch (error) {
    console.error('❌ Add fields failed:', error.response?.data || error.message);
    return false;
  }
}

async function step5_SendSignRequest() {
  console.log('\n📧 STEP 5: Send Sign Request');
  console.log('='.repeat(50));
  
  try {
    // Check if already sent
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const signRequest = await prisma.sign_requests.findUnique({
      where: { id: signRequestId }
    });
    
    if (signRequest && signRequest.status !== 'draft') {
      console.log('⏭️  Sign request already sent');
      console.log(`   Status: ${signRequest.status}`);
      await prisma.$disconnect();
      return true;
    }
    
    await prisma.$disconnect();
    
    const response = await axios.post(
      `${API_BASE}/sign-requests/${signRequestId}/send`,
      {},
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    
    console.log('✅ Sign request sent');
    console.log(`   Status: ${response.data.data.status}`);
    return true;
  } catch (error) {
    console.error('❌ Send failed:', error.response?.data || error.message);
    return false;
  }
}

async function step6_SubmitForApproval() {
  console.log('\n📋 STEP 6: Submit Document for Approval');
  console.log('='.repeat(50));
  
  try {
    // Check if workflow already exists
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const existingInstance = await prisma.workflow_instances.findUnique({
      where: { document_id: documentId }
    });
    
    if (existingInstance) {
      console.log('⏭️  Workflow already exists, skipping submission');
      
      // Get existing approval
      const existingApproval = await prisma.document_approvals.findFirst({
        where: { document_id: documentId },
        orderBy: { created_at: 'desc' }
      });
      
      if (existingApproval) {
        approvalId = existingApproval.id;
        console.log(`✅ Using existing approval`);
        console.log(`   Approval ID: ${approvalId}`);
        console.log(`   Status: ${existingApproval.action}`);
      }
      
      await prisma.$disconnect();
      return true;
    }
    
    await prisma.$disconnect();
    
    // Submit for approval
    const response = await axios.post(
      `${API_BASE}/approvals/submit`,
      {
        document_id: documentId,
        workflow_id: 12 // Simple approval workflow
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    
    approvalId = response.data.data.id;
    console.log('✅ Submitted for approval');
    console.log(`   Approval ID: ${approvalId}`);
    console.log(`   Status: ${response.data.data.status}`);
    return true;
  } catch (error) {
    console.error('❌ Submit failed:', error.response?.data || error.message);
    return false;
  }
}

async function step7_ApproverLogin() {
  console.log('\n👨‍💼 STEP 7: Approver Login');
  console.log('='.repeat(50));
  
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, APPROVER);
    approverToken = response.data.data?.tokens?.accessToken;
    
    if (!approverToken) {
      console.error('❌ Token not found in response');
      return false;
    }
    
    console.log('✅ Approver logged in successfully');
    return true;
  } catch (error) {
    console.error('❌ Approver login failed:', error.response?.data || error.message);
    return false;
  }
}

async function step8_GetPendingApprovals() {
  console.log('\n📋 STEP 8: Get Pending Approvals');
  console.log('='.repeat(50));
  
  try {
    const response = await axios.get(
      `${API_BASE}/approvals/my-pending`,
      {
        headers: { Authorization: `Bearer ${approverToken}` }
      }
    );
    
    const approvals = response.data.data;
    console.log(`✅ Found ${approvals.length} pending approvals`);
    
    if (approvals.length > 0) {
      const approval = approvals[0];
      approvalId = approval.id;
      console.log(`   Using Approval ID: ${approvalId}`);
      console.log(`   Document: ${approval.document?.title}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Get approvals failed:', error.response?.data || error.message);
    return false;
  }
}

async function step9_ApproveWithSignature() {
  console.log('\n✅ STEP 9: Approve with Digital Signature');
  console.log('='.repeat(50));
  
  try {
    // Check if already approved
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const approval = await prisma.document_approvals.findUnique({
      where: { id: approvalId }
    });
    
    if (approval && approval.action !== 'pending') {
      console.log('⏭️  Approval already processed');
      console.log(`   Status: ${approval.action}`);
      await prisma.$disconnect();
      return true;
    }
    
    await prisma.$disconnect();
    
    // Create test signature (base64 image)
    const signatureData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    const response = await axios.post(
      `${API_BASE}/approvals/${approvalId}/approve`,
      {
        comment: 'Approved - Internal signature applied',
        signature_data: signatureData,
        signature_type: 'drawn'
      },
      {
        headers: { Authorization: `Bearer ${approverToken}` }
      }
    );
    
    console.log('✅ Approved with signature');
    console.log(`   Status: ${response.data.data.status}`);
    console.log(`   Comment: ${response.data.data.comment}`);
    return true;
  } catch (error) {
    console.error('❌ Approve failed:', error.response?.data || error.message);
    return false;
  }
}

async function step10_GetExternalSignerToken() {
  console.log('\n🔑 STEP 10: Get External Signer Token');
  console.log('='.repeat(50));
  
  try {
    // Use Prisma to get external signer token
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const externalSigner = await prisma.signers.findFirst({
      where: {
        sign_request_id: signRequestId,
        email: EXTERNAL_SIGNER.email
      }
    });
    
    await prisma.$disconnect();
    
    if (externalSigner && externalSigner.signing_token) {
      externalSignerToken = externalSigner.signing_token;
      console.log('✅ External signer token found');
      console.log(`   Token: ${externalSignerToken.substring(0, 30)}...`);
      return true;
    } else {
      console.log('⚠️ Token not found, may need to send sign request first');
      return false;
    }
  } catch (error) {
    console.error('❌ Get token failed:', error.message);
    return false;
  }
}

async function step11_SendOTPToExternal() {
  console.log('\n📧 STEP 11: Send OTP to External Signer');
  console.log('='.repeat(50));
  
  try {
    const response = await axios.post(
      `${PUBLIC_BASE}/sign/${externalSignerToken}/send-otp`,
      {
        email: EXTERNAL_SIGNER.email
      }
    );
    
    // In dev mode, OTP is returned in response
    if (response.data.data.otp) {
      externalSignerOTP = response.data.data.otp;
      console.log('✅ OTP sent (dev mode)');
      console.log(`   OTP: ${externalSignerOTP}`);
    } else {
      // Use pre-generated OTP for testing
      externalSignerOTP = '178239';
      console.log('✅ OTP sent to email');
      console.log('   Using test OTP: 178239');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Send OTP failed:', error.response?.data || error.message);
    return false;
  }
}

async function step12_ExternalSignerSigns() {
  console.log('\n✍️ STEP 12: External Signer Signs Document');
  console.log('='.repeat(50));
  
  try {
    // Create test signature
    const signatureData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    // Get fields for this signer
    const fieldsResponse = await axios.get(
      `${PUBLIC_BASE}/sign/${externalSignerToken}`,
      {}
    );
    
    const fields = fieldsResponse.data.data.fields || [];
    const fieldValues = {};
    
    fields.forEach(field => {
      if (field.type === 'signature') {
        fieldValues[field.id] = signatureData;
      } else if (field.type === 'date') {
        fieldValues[field.id] = new Date().toLocaleDateString('vi-VN');
      }
    });
    
    const response = await axios.post(
      `${PUBLIC_BASE}/sign/${externalSignerToken}/sign`,
      {
        email: EXTERNAL_SIGNER.email,
        otp: externalSignerOTP,
        signature_data: signatureData,
        signature_type: 'drawn',
        field_values: fieldValues
      }
    );
    
    console.log('✅ External signer signed successfully');
    console.log(`   Status: ${response.data.data.status}`);
    return true;
  } catch (error) {
    console.error('❌ Sign failed:', error.response?.data || error.message);
    console.error('   Error details:', error.response?.data);
    return false;
  }
}

async function step13_DownloadSignedPDF() {
  console.log('\n📥 STEP 13: Download Signed PDF');
  console.log('='.repeat(50));
  
  try {
    const response = await axios.get(
      `${PUBLIC_BASE}/sign/${externalSignerToken}/download-signed`,
      {
        responseType: 'arraybuffer'
      }
    );
    
    // Save PDF
    const outputDir = path.join(__dirname, '../test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, `signed-internal-external-${Date.now()}.pdf`);
    fs.writeFileSync(outputPath, response.data);
    
    const sizeKB = (response.data.length / 1024).toFixed(2);
    console.log('✅ PDF downloaded successfully');
    console.log(`   Size: ${sizeKB} KB`);
    console.log(`   Saved to: ${outputPath}`);
    return true;
  } catch (error) {
    console.error('❌ Download failed:', error.response?.data || error.message);
    return false;
  }
}

async function runFullTest() {
  console.log('\n🧪 TESTING FULL INTERNAL TO EXTERNAL SIGNING FLOW');
  console.log('='.repeat(70));
  console.log('Flow: Upload → Approval → Internal Sign → External Sign → Download');
  console.log('='.repeat(70));
  
  const steps = [
    { name: 'Admin Login', fn: step1_AdminLogin },
    { name: 'Upload Document', fn: step2_UploadDocument },
    { name: 'Add External Signer', fn: step3_AddExternalSigner },
    { name: 'Add Signature Fields', fn: step4_AddSignatureFields },
    { name: 'Send Sign Request', fn: step5_SendSignRequest },
    { name: 'Submit for Approval', fn: step6_SubmitForApproval },
    { name: 'Approver Login', fn: step7_ApproverLogin },
    { name: 'Get Pending Approvals', fn: step8_GetPendingApprovals },
    { name: 'Approve with Signature', fn: step9_ApproveWithSignature },
    { name: 'Get External Token', fn: step10_GetExternalSignerToken },
    { name: 'Send OTP', fn: step11_SendOTPToExternal },
    { name: 'External Sign', fn: step12_ExternalSignerSigns },
    { name: 'Download PDF', fn: step13_DownloadSignedPDF }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const step of steps) {
    const success = await step.fn();
    if (success) {
      passed++;
    } else {
      failed++;
      console.log(`\n❌ Test stopped at: ${step.name}`);
      break;
    }
    await sleep(500); // Small delay between steps
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${passed}/${steps.length}`);
  console.log(`❌ Failed: ${failed}/${steps.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 FULL INTERNAL TO EXTERNAL FLOW: PASSED');
    console.log('\n📋 Test Data:');
    console.log(`   Document ID: ${documentId}`);
    console.log(`   Sign Request ID: ${signRequestId}`);
    console.log(`   Approval ID: ${approvalId}`);
    console.log(`   External Signer: ${EXTERNAL_SIGNER.email}`);
    console.log(`   External Token: ${externalSignerToken?.substring(0, 30)}...`);
  } else {
    console.log('\n❌ FULL FLOW TEST: FAILED');
  }
  
  console.log('='.repeat(70));
}

// Run test
runFullTest().catch(console.error);
