const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_BASE = 'http://localhost:4000/api/v1';

async function testCompleteBackendFlow() {
  let documentId, signRequestId, approvalId;
  
  try {
    console.log('🧪 COMPLETE BACKEND FLOW TEST\n');
    console.log('━'.repeat(60));

    // ============================================
    // PHASE 1: UPLOAD & APPROVAL
    // ============================================
    console.log('\n📦 PHASE 1: Upload Document with Approval Workflow\n');

    // Step 1: Login as admin
    console.log('1️⃣ Login as admin...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@acme.local',
      password: 'password123'
    });
    const adminToken = loginRes.data.data.tokens.accessToken;
    console.log('✅ Logged in as admin\n');

    // Step 2: Upload document
    console.log('2️⃣ Upload document...');
    const form = new FormData();
    
    // Create test PDF
    const testPdfPath = path.join(__dirname, 'test-backend.pdf');
    const pdfContent = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000052 00000 n
0000000101 00000 n
trailer<</Size 4/Root 1 0 R>>
startxref
190
%%EOF`;
    fs.writeFileSync(testPdfPath, pdfContent);

    form.append('file', fs.createReadStream(testPdfPath));
    form.append('title', 'Backend Test Document');
    form.append('document_type_id', '2'); // Hợp đồng (requires approval + signing)
    form.append('require_digital_signing', 'true');

    const uploadRes = await axios.post(`${API_BASE}/documents`, form, {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${adminToken}` }
    });

    documentId = uploadRes.data.data.document.id;
    signRequestId = uploadRes.data.data.document.sign_request_id;
    console.log(`✅ Document uploaded: #${documentId}`);
    console.log(`✅ Sign request created: #${signRequestId}\n`);

    // Step 3: Add signers
    console.log('3️⃣ Add signers...');
    await axios.post(`${API_BASE}/sign-requests/${signRequestId}/signers`, {
      email: 'dir.it@acme.local',
      name: 'Phạm Minh Tuấn',
      signing_order: 1
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    
    await axios.post(`${API_BASE}/sign-requests/${signRequestId}/signers`, {
      email: 'admin@acme.local',
      name: 'Admin',
      signing_order: 2
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    console.log('✅ Added 2 signers\n');

    // Step 4: Add signature fields
    console.log('4️⃣ Add signature fields...');
    await axios.post(`${API_BASE}/sign-requests/${signRequestId}/fields`, {
      fields: [
        { type: 'signature', page: 1, x: 10, y: 70, width: 200, height: 50, required: true },
        { type: 'signature', page: 1, x: 10, y: 20, width: 200, height: 50, required: true }
      ]
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    console.log('✅ Added 2 signature fields\n');

    // Step 5: Submit for approval
    console.log('5️⃣ Submit for approval...');
    const submitRes = await axios.post(`${API_BASE}/approvals/submit`, {
      document_id: documentId,
      workflow_id: 1 // Simple workflow
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    console.log('✅ Submitted for approval');
    console.log(`   Message: ${submitRes.data.data.message}\n`);

    // Step 6: Check document status
    console.log('6️⃣ Check document status...');
    let doc = await prisma.documents.findUnique({
      where: { id: documentId },
      include: { sign_request: true }
    });
    console.log(`   Document status: ${doc.status}`);
    console.log(`   Sign request status: ${doc.sign_request?.status}\n`);

    // ============================================
    // PHASE 2: APPROVAL PROCESS
    // ============================================
    console.log('━'.repeat(60));
    console.log('\n✅ PHASE 2: Approval Process\n');

    // Step 7: Get pending approval
    console.log('7️⃣ Get pending approval...');
    const approval = await prisma.document_approvals.findFirst({
      where: { 
        document_id: documentId,
        action: 'pending'
      },
      include: { approver: true }
    });
    
    if (!approval) {
      throw new Error('No pending approval found');
    }
    
    approvalId = approval.id;
    console.log(`✅ Found approval #${approvalId}`);
    console.log(`   Approver: ${approval.approver.email}\n`);

    // Step 8: Login as approver
    console.log('8️⃣ Login as approver...');
    const approverLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: approval.approver.email,
      password: 'password123'
    });
    const approverToken = approverLoginRes.data.data.tokens.accessToken;
    console.log(`✅ Logged in as ${approval.approver.email}\n`);

    // Step 9: Approve document
    console.log('9️⃣ Approve document...');
    const approveRes = await axios.post(
      `${API_BASE}/approvals/${approvalId}/approve`,
      { comment: 'Approved via backend test' },
      { headers: { Authorization: `Bearer ${approverToken}` } }
    );
    console.log('✅ Approved!');
    console.log(`   Status: ${approveRes.data.data.status}`);
    console.log(`   Message: ${approveRes.data.data.message}\n`);

    // Step 10: Wait and check if sign request was sent
    console.log('🔟 Wait 2 seconds for auto-send...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('');

    // ============================================
    // PHASE 3: VERIFY SIGNING SETUP
    // ============================================
    console.log('━'.repeat(60));
    console.log('\n📝 PHASE 3: Verify Signing Setup\n');

    // Step 11: Check document status
    console.log('1️⃣1️⃣ Check document status...');
    doc = await prisma.documents.findUnique({
      where: { id: documentId },
      include: { 
        sign_request: {
          include: {
            signers: {
              orderBy: { signing_order: 'asc' }
            }
          }
        }
      }
    });
    
    console.log(`   Document status: ${doc.status}`);
    console.log(`   Sign request status: ${doc.sign_request?.status}\n`);

    // Step 12: Check signers have tokens
    console.log('1️⃣2️⃣ Check signers...');
    const signers = doc.sign_request?.signers || [];
    let allHaveTokens = true;
    
    signers.forEach((s, i) => {
      const hasToken = !!s.signing_token;
      console.log(`   ${i + 1}. ${s.name} (Order ${s.signing_order})`);
      console.log(`      Status: ${s.status}`);
      console.log(`      Has Token: ${hasToken ? '✅' : '❌'}`);
      if (hasToken) {
        console.log(`      URL: http://localhost:3000/sign/${s.signing_token}`);
      }
      if (!hasToken) allHaveTokens = false;
    });
    console.log('');

    // Step 13: Test sign requests API
    console.log('1️⃣3️⃣ Test sign requests API...');
    const myRequestsRes = await axios.get(`${API_BASE}/sign-requests/my-requests`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const myRequests = myRequestsRes.data.data.sign_requests;
    const thisRequest = myRequests.find(r => r.id === signRequestId);
    
    if (thisRequest) {
      console.log(`✅ Found in my-requests API`);
      console.log(`   Progress: ${thisRequest.progress.signed}/${thisRequest.progress.total} (${thisRequest.progress.percentage}%)`);
    } else {
      console.log(`❌ Not found in my-requests API`);
    }
    console.log('');

    // ============================================
    // PHASE 4: TEST RESULTS
    // ============================================
    console.log('━'.repeat(60));
    console.log('\n📊 TEST RESULTS\n');

    const results = {
      documentCreated: !!documentId,
      signRequestCreated: !!signRequestId,
      signersAdded: signers.length === 2,
      fieldsAdded: true,
      approvalSubmitted: !!approvalId,
      documentApproved: doc.status === 'pending_signature' || doc.status === 'approved',
      signRequestSent: doc.sign_request?.status === 'pending',
      signersHaveTokens: allHaveTokens,
      apiWorking: !!thisRequest
    };

    console.log('✅ Document Created:', results.documentCreated);
    console.log('✅ Sign Request Created:', results.signRequestCreated);
    console.log('✅ Signers Added:', results.signersAdded);
    console.log('✅ Fields Added:', results.fieldsAdded);
    console.log('✅ Approval Submitted:', results.approvalSubmitted);
    console.log(results.documentApproved ? '✅' : '❌', 'Document Approved:', results.documentApproved);
    console.log(results.signRequestSent ? '✅' : '❌', 'Sign Request Sent:', results.signRequestSent);
    console.log(results.signersHaveTokens ? '✅' : '❌', 'Signers Have Tokens:', results.signersHaveTokens);
    console.log(results.apiWorking ? '✅' : '❌', 'API Working:', results.apiWorking);

    const allPassed = Object.values(results).every(v => v === true);
    
    console.log('\n━'.repeat(60));
    if (allPassed) {
      console.log('\n🎉 ALL TESTS PASSED! Backend is working correctly!\n');
    } else {
      console.log('\n⚠️  SOME TESTS FAILED! Check the results above.\n');
    }

    console.log('📋 Test Data:');
    console.log(`   Document ID: ${documentId}`);
    console.log(`   Sign Request ID: ${signRequestId}`);
    console.log(`   Approval ID: ${approvalId}`);
    console.log(`\n🔗 Next: Test in UI at http://localhost:3000/sign-requests\n`);

    // Cleanup
    fs.unlinkSync(testPdfPath);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  } finally {
    await prisma.$disconnect();
  }
}

testCompleteBackendFlow();
