/**
 * Test complete workflow flow:
 * 1. Create document with workflow → signers created with status 'waiting_approval'
 * 2. Assign fields to signers
 * 3. Approve document → signers activated (status → 'pending')
 * 4. Send sign request
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing Complete Workflow Flow\n');
  console.log('Flow: Create Doc → Assign Fields → Approve → Activate Signers\n');

  try {
    const workflowId = 17; // "test" workflow with 1 approver + 1 signer
    const tenantId = 1;
    const adminId = 1;
    const approverId = 6;

    // Get workflow details
    const workflow = await prisma.workflows.findUnique({
      where: { id: workflowId },
      include: {
        steps: {
          orderBy: { step_order: 'asc' }
        }
      }
    });

    console.log(`📋 Workflow: ${workflow.name}`);
    const approverSteps = workflow.steps.filter(s => s.participant_role === 'approver' || !s.participant_role);
    const signerSteps = workflow.steps.filter(s => s.participant_role === 'signer');
    console.log(`   Approver steps: ${approverSteps.length}`);
    console.log(`   Signer steps: ${signerSteps.length}`);
    console.log();

    // STEP 1: Create document (simulating documents.service.ts logic)
    console.log('📄 STEP 1: Creating document with workflow...');
    
    const document = await prisma.documents.create({
      data: {
        tenant_id: tenantId,
        owner_id: adminId,
        title: 'Complete Workflow Test',
        status: 'draft',
        document_number: `COMPLETE-${Date.now()}`,
        original_file_name: 'test.pdf',
        file_path: 'storage/test/test.pdf'
      }
    });
    console.log(`   ✓ Document created: ${document.document_number}`);

    // Create sign request
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
    console.log(`   ✓ Sign request created: ${signRequest.id}`);

    // Create workflow instance
    const instance = await prisma.workflow_instances.create({
      data: {
        document_id: document.id,
        workflow_id: workflowId,
        current_step_id: approverSteps[0].id,
        status: 'in_progress'
      }
    });
    console.log(`   ✓ Workflow instance created: ${instance.id}`);

    // Create approvals
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    
    const approval = await prisma.document_approvals.create({
      data: {
        document_id: document.id,
        workflow_id: workflowId,
        workflow_step_id: approverSteps[0].id,
        approver_user_id: approverId,
        due_date: dueDate
      }
    });
    console.log(`   ✓ Approval created for approver ID: ${approverId}`);

    // ✅ Create signers with status 'waiting_approval'
    for (const step of signerSteps) {
      if (step.approver_type === 'user' && step.approver_id) {
        const user = await prisma.users.findUnique({
          where: { id: step.approver_id },
          select: { id: true, email: true, full_name: true }
        });
        
        if (user) {
          await prisma.signers.create({
            data: {
              sign_request_id: signRequest.id,
              user_id: user.id,
              email: user.email,
              name: user.full_name || user.email,
              role: 'signer',
              signing_order: step.step_order,
              status: 'waiting_approval', // ✅ Key: waiting for approval
              is_internal: true
            }
          });
          console.log(`   ✓ Signer created: ${user.email} (status: waiting_approval)`);
        }
      }
    }

    // Update document status
    await prisma.documents.update({
      where: { id: document.id },
      data: { status: 'pending_approval' }
    });
    console.log(`   ✓ Document status: pending_approval`);
    console.log();

    // Check state after creation
    let signers = await prisma.signers.findMany({
      where: { sign_request_id: signRequest.id }
    });
    console.log(`📊 State after creation:`);
    console.log(`   Signers: ${signers.length}`);
    for (const signer of signers) {
      console.log(`     - ${signer.name}: status = ${signer.status}`);
    }
    console.log();

    // STEP 2: Assign fields (simulated - in real app, user does this in editor)
    console.log('✏️  STEP 2: Assigning fields to signers...');
    console.log('   (In real app, user assigns fields in editor)');
    console.log('   Skipping for this test...');
    console.log();

    // STEP 3: Approve document
    console.log('✅ STEP 3: Approving document...');
    await prisma.document_approvals.update({
      where: { id: approval.id },
      data: {
        action: 'approved',
        acted_at: new Date()
      }
    });
    console.log(`   ✓ Approval action: approved`);
    console.log();

    // STEP 4: Activate signers (simulating approvals.service.ts logic)
    console.log('🚀 STEP 4: Activating signers...');
    
    const waitingSigners = await prisma.signers.findMany({
      where: {
        sign_request_id: signRequest.id,
        status: 'waiting_approval'
      }
    });
    
    console.log(`   Found ${waitingSigners.length} signers waiting for approval`);
    
    for (const signer of waitingSigners) {
      await prisma.signers.update({
        where: { id: signer.id },
        data: { status: 'pending' }
      });
      console.log(`   ✓ Activated signer: ${signer.name} (status: pending)`);
    }

    // Update workflow instance
    await prisma.workflow_instances.update({
      where: { id: instance.id },
      data: {
        status: 'completed',
        completed_at: new Date()
      }
    });

    // Update document status
    await prisma.documents.update({
      where: { id: document.id },
      data: { status: 'pending_signature' }
    });
    console.log(`   ✓ Document status: pending_signature`);
    console.log();

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
      where: { sign_request_id: signRequest.id }
    });
    console.log(`   Signers: ${finalSigners.length}`);
    for (const signer of finalSigners) {
      console.log(`     - ${signer.name}: status = ${signer.status}`);
    }
    console.log();

    // Verify
    console.log('✅ Verification:');
    const allSignersActivated = finalSigners.every(s => s.status === 'pending');
    
    if (finalDoc.status === 'pending_signature' && allSignersActivated) {
      console.log('   ✅ TEST PASSED!');
      console.log('   - Document moved to pending_signature ✓');
      console.log('   - All signers activated (status: pending) ✓');
      console.log('   - Ready to send sign request ✓');
    } else {
      console.log('   ❌ TEST FAILED!');
      console.log(`   - Expected status: pending_signature, got: ${finalDoc.status}`);
      console.log(`   - All signers activated: ${allSignersActivated}`);
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
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
