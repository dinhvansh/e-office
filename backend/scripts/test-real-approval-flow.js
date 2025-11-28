/**
 * Test real approval flow using the API service
 * This tests the actual approvals.service.ts approve() method
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing Real Approval Flow with API Service\n');

  try {
    const workflowId = 17; // "test" workflow with 1 approver + 1 signer
    const tenantId = 1;
    const adminId = 1;
    const approverId = 6; // Van NGUYEN

    console.log('📄 Creating test document...');
    const document = await prisma.documents.create({
      data: {
        tenant_id: tenantId,
        owner_id: adminId,
        title: 'Real API Test - Approval to Signer',
        status: 'draft',
        document_number: `API-${Date.now()}`,
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

    // Import and use the actual service
    console.log('🚀 Submitting for approval using approvalsService...');
    const { approvalsService } = require('../src/modules/approvals/approvals.service');
    
    const submitResult = await approvalsService.submitForApproval(
      document.id,
      workflowId,
      tenantId,
      adminId
    );
    
    console.log(`   ✓ ${submitResult.message}`);
    console.log(`   Approvals created: ${submitResult.approvals}`);
    console.log();

    // Get the approval record
    const approval = await prisma.document_approvals.findFirst({
      where: { document_id: document.id },
      include: {
        approver: {
          select: { email: true, full_name: true }
        }
      }
    });

    console.log(`   Approval for: ${approval.approver.full_name}`);
    console.log(`   Status: ${approval.action}`);
    console.log();

    // Check signers before approval
    let signers = await prisma.signers.findMany({
      where: { sign_request_id: signRequest.id }
    });
    console.log(`   Signers before approval: ${signers.length}`);
    console.log();

    // Now approve using the service
    console.log('✅ Approving document using approvalsService...');
    const approveResult = await approvalsService.approve(
      approval.id,
      approverId,
      tenantId,
      'Approved via API test'
    );
    
    console.log(`   ✓ ${approveResult.message}`);
    console.log(`   Status: ${approveResult.status}`);
    console.log();

    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check final state
    console.log('📊 Final State:');
    
    const finalDoc = await prisma.documents.findUnique({
      where: { id: document.id }
    });
    console.log(`   Document status: ${finalDoc.status}`);

    const finalApprovals = await prisma.document_approvals.findMany({
      where: { document_id: document.id }
    });
    console.log(`   Approvals: ${finalApprovals.length} (${finalApprovals.filter(a => a.action === 'approved').length} approved)`);

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
      console.log(`       Status: ${signer.status}, Order: ${signer.signing_order}, Internal: ${signer.is_internal}`);
    }
    console.log();

    const finalSignRequest = await prisma.sign_requests.findUnique({
      where: { id: signRequest.id }
    });
    console.log(`   Sign request status: ${finalSignRequest.status}`);
    console.log();

    // Verify
    console.log('✅ Verification:');
    const expectedStatus = 'pending_signature';
    const expectedSigners = 1;
    
    if (finalDoc.status === expectedStatus && finalSigners.length === expectedSigners) {
      console.log('   ✅ TEST PASSED!');
      console.log(`   - Document status: ${finalDoc.status} ✓`);
      console.log(`   - Signers created: ${finalSigners.length} ✓`);
      console.log(`   - Sign request status: ${finalSignRequest.status} ✓`);
    } else {
      console.log('   ❌ TEST FAILED!');
      console.log(`   - Expected document status: ${expectedStatus}, got: ${finalDoc.status}`);
      console.log(`   - Expected signers: ${expectedSigners}, got: ${finalSigners.length}`);
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
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
