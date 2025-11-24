const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_BASE = 'http://localhost:4000/api/v1';

async function testApprovalToSigning() {
  try {
    console.log('🧪 Testing Approval → Signing Flow\n');

    // Step 1: Check if there's a pending approval
    console.log('1️⃣ Checking pending approvals...');
    const pendingApprovals = await prisma.document_approvals.findMany({
      where: { action: 'pending' },
      include: {
        document: {
          include: {
            document_type: true,
            sign_request: {
              include: {
                signers: true
              }
            }
          }
        },
        workflow_step: true,
        approver: true
      },
      take: 1
    });

    if (pendingApprovals.length === 0) {
      console.log('❌ No pending approvals found');
      console.log('ℹ️  Please create a document with approval workflow first');
      return;
    }

    const approval = pendingApprovals[0];
    console.log(`✅ Found approval #${approval.id}`);
    console.log(`   Document: ${approval.document.document_number || approval.document.title}`);
    console.log(`   Approver: ${approval.approver.full_name || approval.approver.email}`);
    console.log(`   Step: ${approval.workflow_step.step_name}`);
    console.log(`   Requires Signing: ${approval.document.document_type?.require_digital_signing ? 'Yes' : 'No'}`);
    console.log(`   Sign Request ID: ${approval.document.sign_request_id || 'None'}\n`);

    // Step 2: Login as approver
    console.log('2️⃣ Login as approver...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: approval.approver.email,
      password: 'password123'
    });
    const token = loginRes.data.data.tokens.accessToken;
    console.log('✅ Logged in\n');

    // Step 3: Approve the document
    console.log('3️⃣ Approving document...');
    const approveRes = await axios.post(
      `${API_BASE}/approvals/${approval.id}/approve`,
      {
        comment: 'Approved via test script'
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    console.log('✅ Approval response:', approveRes.data.data);
    console.log('');

    // Step 4: Check document status
    console.log('4️⃣ Checking document status...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

    const updatedDoc = await prisma.documents.findUnique({
      where: { id: approval.document_id },
      include: {
        sign_request: {
          include: {
            signers: true
          }
        }
      }
    });

    console.log(`   Document Status: ${updatedDoc?.status}`);
    console.log(`   Sign Request Status: ${updatedDoc?.sign_request?.status || 'N/A'}`);
    
    if (updatedDoc?.sign_request) {
      console.log(`   Signers: ${updatedDoc.sign_request.signers.length}`);
      updatedDoc.sign_request.signers.forEach((s, i) => {
        console.log(`     ${i + 1}. ${s.name} - ${s.status} - Token: ${s.signing_token ? 'Yes' : 'No'}`);
      });
    }
    console.log('');

    // Step 5: Check if sign request was sent
    if (updatedDoc?.sign_request_id) {
      const signRequest = await prisma.sign_requests.findUnique({
        where: { id: updatedDoc.sign_request_id },
        include: {
          signers: {
            orderBy: { signing_order: 'asc' }
          }
        }
      });

      console.log('5️⃣ Sign Request Details:');
      console.log(`   ID: ${signRequest?.id}`);
      console.log(`   Status: ${signRequest?.status}`);
      console.log(`   Workflow Type: ${signRequest?.workflow_type}`);
      console.log(`   Signers:`);
      
      signRequest?.signers.forEach((s, i) => {
        console.log(`\n   ${i + 1}. ${s.name} (${s.email})`);
        console.log(`      Order: ${s.signing_order}`);
        console.log(`      Status: ${s.status}`);
        console.log(`      Has Token: ${s.signing_token ? 'Yes' : 'No'}`);
        if (s.signing_token) {
          console.log(`      URL: http://localhost:3000/sign/${s.signing_token}`);
        }
      });
    }

    console.log('\n━'.repeat(60));
    console.log('\n✅ Test Complete!');
    console.log('\n📋 Summary:');
    console.log(`   Approval: ${approveRes.data.data.status}`);
    console.log(`   Document Status: ${updatedDoc?.status}`);
    console.log(`   Sign Request Status: ${updatedDoc?.sign_request?.status || 'N/A'}`);
    
    if (updatedDoc?.status === 'pending_signature' && updatedDoc?.sign_request?.status === 'pending') {
      console.log('\n✅ SUCCESS: Document moved to signing phase!');
    } else if (updatedDoc?.status === 'completed') {
      console.log('\n✅ SUCCESS: Document completed (no signing required)');
    } else {
      console.log('\n⚠️  WARNING: Document status may not be correct');
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testApprovalToSigning();
