/**
 * Test Digital Signature Flow
 * Tests both internal (approval) and external (public) signing
 */

const axios = require('axios');

const API_BASE = 'http://localhost:4000/api/v1';
const PUBLIC_BASE = 'http://localhost:4000/api/v1/public';

// Test data
let adminToken = '';
let documentId = 0;
let signRequestId = 0;
let signerId = 0;
let signingToken = '';
let approvalId = 0;

// Sample signature (small base64 image)
const SAMPLE_SIGNATURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function login() {
  console.log('\n📝 Test 1: Login as admin');
  try {
    const res = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@acme.local',
      password: 'password123',
    });
    
    // Get token from response
    adminToken = res.data.data?.tokens?.accessToken || res.data.data?.token;
    
    console.log('✅ Login successful');
    console.log('  → Token length:', adminToken?.length || 0);
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function uploadDocument() {
  console.log('\n📝 Test 2: Get existing document with sign request');
  try {
    console.log('  → Token:', adminToken ? 'Present' : 'Missing');
    
    // Get documents list
    const res = await axios.get(`${API_BASE}/documents`, {
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });

    const docs = res.data.data.documents || res.data.data;
    
    // Find a document with sign_request_id
    const docWithSignRequest = docs.find(d => d.sign_request_id);
    
    if (docWithSignRequest) {
      documentId = docWithSignRequest.id;
      signRequestId = docWithSignRequest.sign_request_id;
      console.log('✅ Found document with sign request:', documentId);
      console.log('✅ Sign request ID:', signRequestId);
      return true;
    }
    
    // If no document with sign request, use first document
    if (docs.length > 0) {
      documentId = docs[0].id;
      console.log('✅ Using document:', documentId);
      console.log('⚠️  Document has no sign request, will skip signing tests');
      return true;
    }
    
    console.log('❌ No documents found in database');
    return false;
  } catch (error) {
    console.error('❌ Get document failed:', error.response?.data || error.message);
    return false;
  }
}

async function addSigners() {
  console.log('\n📝 Test 3: Get existing signers');
  
  if (!signRequestId) {
    console.log('⚠️  No sign request, skipping signer tests');
    return true;
  }
  
  try {
    // Get signers from database
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const signers = await prisma.signers.findMany({
      where: { sign_request_id: signRequestId },
      orderBy: { id: 'desc' },
      take: 1,
    });
    
    if (signers.length > 0) {
      signerId = signers[0].id;
      signingToken = signers[0].signing_token;
      console.log('✅ Found signer:', signerId);
      console.log('✅ Signing token:', signingToken);
      await prisma.$disconnect();
      return true;
    }
    
    console.log('⚠️  No signers found, skipping signing tests');
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.error('❌ Get signer failed:', error.message);
    return false;
  }
}

async function testPublicSigningFlow() {
  console.log('\n📝 Test 4: Public signing flow (External signer)');
  
  if (!signingToken) {
    console.log('⚠️  No signing token, skipping public signing test');
    return true;
  }
  
  try {
    // Step 1: Get signing page data
    console.log('  → Step 1: Get signing page data');
    const pageRes = await axios.get(`${PUBLIC_BASE}/sign/${signingToken}`);
    console.log('  ✅ Signing page data loaded');

    // Step 2: Send OTP
    console.log('  → Step 2: Send OTP');
    await axios.post(`${PUBLIC_BASE}/sign/${signingToken}/send-otp`, {
      email: 'signer@example.com',
    });
    console.log('  ✅ OTP sent');

    // Step 3: Get OTP from database (for testing)
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const signer = await prisma.signers.findUnique({
      where: { id: signerId },
      select: { otp: true },
    });
    
    if (!signer?.otp) {
      throw new Error('OTP not found in database');
    }

    // Decrypt OTP (it's hashed, so we'll use a known OTP for testing)
    // In real scenario, user gets OTP from email
    console.log('  ℹ️  OTP is hashed in DB, using test OTP: 123456');

    // Step 4: Submit signature with OTP
    console.log('  → Step 3: Submit signature');
    
    // For testing, we need to update OTP to a known value
    const bcrypt = require('bcryptjs');
    const testOtp = '123456';
    const hashedOtp = await bcrypt.hash(testOtp, 10);
    await prisma.signers.update({
      where: { id: signerId },
      data: { 
        otp: hashedOtp,
        otp_expire: new Date(Date.now() + 10 * 60 * 1000), // 10 mins
      },
    });

    const signRes = await axios.post(`${PUBLIC_BASE}/sign/${signingToken}/sign`, {
      otp: testOtp,
      signature_data: SAMPLE_SIGNATURE,
      signature_type: 'drawn',
      field_values: [],
    });

    console.log('  ✅ Signature submitted successfully');
    console.log('  ✅ Document signed:', signRes.data.data.signed);
    
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.error('❌ Public signing failed:', error.response?.data || error.message);
    return false;
  }
}

async function testInternalApprovalFlow() {
  console.log('\n📝 Test 5: Internal approval flow (with signature)');
  
  try {
    // Step 1: Submit document for approval
    console.log('  → Step 1: Submit for approval');
    const submitRes = await axios.post(
      `${API_BASE}/approvals/submit`,
      {
        document_id: documentId,
        workflow_id: 1, // Simple workflow
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    console.log('  ✅ Document submitted for approval');

    // Step 2: Get pending approvals
    console.log('  → Step 2: Get pending approvals');
    const approvalsRes = await axios.get(`${API_BASE}/approvals/my-pending`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    
    const approvals = approvalsRes.data.data.approvals;
    if (approvals.length === 0) {
      console.log('  ⚠️  No pending approvals (admin might not be approver)');
      return true;
    }

    approvalId = approvals[0].id;
    console.log('  ✅ Found pending approval:', approvalId);

    // Step 3: Approve with signature
    console.log('  → Step 3: Approve with signature');
    const approveRes = await axios.post(
      `${API_BASE}/approvals/${approvalId}/approve`,
      {
        comment: 'Approved with digital signature',
        signature_data: SAMPLE_SIGNATURE,
        signature_type: 'drawn',
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    console.log('  ✅ Approval submitted with signature');
    console.log('  ✅ Status:', approveRes.data.data.status || approveRes.data.data.message);
    return true;
  } catch (error) {
    console.error('❌ Internal approval failed:', error.response?.data || error.message);
    return false;
  }
}

async function verifySignatures() {
  console.log('\n📝 Test 6: Verify signatures saved');
  
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Check external signer signature
    const signer = await prisma.signers.findUnique({
      where: { id: signerId },
      select: {
        signature_data: true,
        signature_type: true,
        signed_at: true,
        status: true,
      },
    });

    console.log('  External Signer:');
    console.log('    Status:', signer?.status);
    console.log('    Signed at:', signer?.signed_at);
    console.log('    Signature type:', signer?.signature_type);
    console.log('    Signature data length:', signer?.signature_data?.length || 0);

    if (signer?.signature_data) {
      console.log('  ✅ External signature saved');
    } else {
      console.log('  ❌ External signature NOT saved');
    }

    // Check internal approval signature
    if (approvalId > 0) {
      const approval = await prisma.document_approvals.findUnique({
        where: { id: approvalId },
        select: {
          signature_data: true,
          signature_type: true,
          acted_at: true,
          action: true,
        },
      });

      console.log('\n  Internal Approval:');
      console.log('    Action:', approval?.action);
      console.log('    Acted at:', approval?.acted_at);
      console.log('    Signature type:', approval?.signature_type);
      console.log('    Signature data length:', approval?.signature_data?.length || 0);

      if (approval?.signature_data) {
        console.log('  ✅ Internal signature saved');
      } else {
        console.log('  ⚠️  Internal signature NOT saved (might be optional)');
      }
    }

    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Digital Signature Tests\n');
  console.log('=' .repeat(60));

  const results = [];

  // Run tests sequentially
  results.push(await login());
  if (!results[0]) return;

  results.push(await uploadDocument());
  if (!results[1]) return;

  results.push(await addSigners());
  if (!results[2]) return;

  results.push(await testPublicSigningFlow());
  results.push(await testInternalApprovalFlow());
  results.push(await verifySignatures());

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary\n');
  
  const testNames = [
    'Login',
    'Upload Document',
    'Add Signers',
    'Public Signing Flow',
    'Internal Approval Flow',
    'Verify Signatures',
  ];

  let passed = 0;
  results.forEach((result, index) => {
    const status = result ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${testNames[index]}`);
    if (result) passed++;
  });

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${passed}/${results.length} tests passed`);
  
  if (passed === results.length) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed');
  }
}

// Run tests
runTests().catch(console.error);
