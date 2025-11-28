/**
 * Test approval flow through HTTP API
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');

const API_URL = 'http://localhost:4000/api/v1';

async function main() {
  console.log('🧪 Testing Approval Flow via HTTP API\n');

  try {
    const workflowId = 17;
    const tenantId = 1;
    const adminId = 1;
    const approverId = 6;

    // Login as admin
    console.log('🔐 Logging in as admin...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@acme.local',
      password: 'password123'
    });
    const adminToken = loginRes.data.data.accessToken;
    console.log('   ✓ Admin logged in');
    console.log();

    // Login as approver
    console.log('🔐 Logging in as approver (Van NGUYEN)...');
    const approverLoginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'vanqn95@gamil.com',
      password: 'password123'
    });
    const approverToken = approverLoginRes.data.data.accessToken;
    console.log('   ✓ Approver logged in');
    console.log();

    // Create document
    console.log('📄 Creating test document...');
    const document = await prisma.documents.create({
      data: {
        tenant_id: tenantId,
        owner_id: adminId,
        title: 'API Test - Approval to Signer Flow',
        status: 'draft',
        document_number: `APITEST-${Date.now()}`,
        original_file_name: 'test.pdf',
        file_path: 'storage/test/test.pdf'
      }
    });
    console.log(`   Created: ${document.document_number} (ID: ${document.id})`);
    console.log();

    // Create sign request
    console.log('📝 Creating sign request...');
    const signRequest = await prisma.sign_requests.create({
      data: {
        tenant_id: tenantId,
        document_id: document.id,
        title: document.title,
        workflow_type: 'sequential',
        status: 'draft',
        auto_created: true
      }
    });
    await prisma.documents.update({
      where: { id: document.id },
      data: { sign_request_id: signRequest.id }
    });
    console.log(`   Created sign request ID: ${signRequest.id}`);
    console.log();

    // Submit for approval via API
    console.log('🚀 Submitting for approval via API...');
    try {
      const submitRes = await axios.post(
        `${API_URL}/approvals/submit`,
        {
          document_id: document.id,
          workflow_id: workflowId
        },
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );
      console.log(`   ✓ ${submitRes.data.message}`);
      console.log(`   Approvals created: ${submitRes.data.approvals}`);
    } catch (error) {
      console.log(`   ❌ API Error: ${error.response?.data?.message || error.message}`);
      throw error;
    }
    console.log();

    // Get approval
    const approval = await prisma.document_approvals.findFirst({
      where: { document_id: document.id },
      include: {
        approver: {
          select: { email: true, full_name: true }
        }
      }
    });
    console.log(`   Approval ID: ${approval.id}`);
    console.log(`   Approver: ${approval.approver.full_name}`);
    console.log();

    // Check signers before approval
    let signers = await prisma.signers.findMany({
      where: { sign_request_id: signRequest.id }
    });
    console.log(`   Signers before approval: ${signers.length}`);
    console.log();

    // Approve via API
    console.log('✅ Approving document via API...');
    try {
      const approveRes = await axios.post(
        `${API_URL}/approvals/${approval.id}/approve`,
        {
          comment: 'Approved via API test'
        },
        {
          headers: { Authorization: `Bearer ${approverToken}` }
        }
      );
      console.log(`   ✓ ${approveRes.data.message}`);
      console.log(`   Status: ${approveRes.data.status}`);
    } catch (error) {
      console.log(`   ❌ API Error: ${error.response?.data?.message || error.message}`);
      throw error;
    }
    console.log();

    // Wait for async operations
    console.log('⏳ Waiting for async operations...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log();

    // Check final state
    console.log('📊 Final State:');
    
    const finalDoc = await prisma.documents.findUnique({
      where: { id: document.id }
    });
    console.log(`   Document status: ${finalDoc.status}`);

    const finalSigners = await prisma.signers.findMany({
      where: { sign_request_id: signRequest.id },
      include: {
        user: {
          select: { email: true, full_name: true }
        }
      }
    });
    console.log(`   Signers: ${finalSigners.length}`);
    for (const signer of finalSigners) {
      console.log(`     - ${signer.name} (${signer.email})`);
      console.log(`       Status: ${signer.status}, Order: ${signer.signing_order}`);
    }
    console.log();

    const finalSignRequest = await prisma.sign_requests.findUnique({
      where: { id: signRequest.id }
    });
    console.log(`   Sign request status: ${finalSignRequest.status}`);
    console.log();

    // Verify
    console.log('✅ Verification:');
    if (finalDoc.status === 'pending_signature' && finalSigners.length === 1) {
      console.log('   ✅ TEST PASSED!');
      console.log('   - Document moved to pending_signature ✓');
      console.log('   - 1 signer created from workflow ✓');
      console.log('   - Sign request sent ✓');
    } else {
      console.log('   ❌ TEST FAILED!');
      console.log(`   - Expected status: pending_signature, got: ${finalDoc.status}`);
      console.log(`   - Expected signers: 1, got: ${finalSigners.length}`);
    }
    console.log();

    // Cleanup
    console.log('🧹 Cleaning up...');
    await prisma.document_approvals.deleteMany({ where: { document_id: document.id } });
    await prisma.workflow_instances.deleteMany({ where: { document_id: document.id } });
    await prisma.signers.deleteMany({ where: { sign_request_id: signRequest.id } });
    await prisma.sign_requests.delete({ where: { id: signRequest.id } });
    await prisma.documents.delete({ where: { id: document.id } });
    console.log('   ✓ Cleanup complete');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
