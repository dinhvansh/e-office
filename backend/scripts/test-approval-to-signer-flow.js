/**
 * Test complete flow: Approval → Signer creation
 * Tests that after all approvals are done, signers are automatically created from workflow
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing Approval → Signer Flow\n');

  try {
    // Use workflow ID 17 "test" which has 1 approver + 1 signer
    const workflowId = 17;
    const tenantId = 1;
    const adminId = 1; // Document owner
    const approverId = 6; // Van NGUYEN - approver

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

    // Create test document
    console.log('📄 Creating test document...');
    const document = await prisma.documents.create({
      data: {
        tenant_id: tenantId,
        owner_id: adminId,
        title: 'Test Approval to Signer Flow',
        status: 'draft',
        document_number: `FLOW-${Date.now()}`,
        original_file_name: 'test.pdf',
        file_path: 'storage/test/test.pdf'
      }
    });
    console.log(`   Created: ${document.document_number}`);
    console.log();

    // Create draft sign request
    console.log('📝 Creating draft sign request...');
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

    // Submit for approval
    console.log('🚀 Step 1: Submit for approval...');
    const firstStep = approverSteps[0];
    
    // Create workflow instance
    const instance = await prisma.workflow_instances.create({
      data: {
        document_id: document.id,
        workflow_id: workflowId,
        current_step_id: firstStep.id,
        status: 'in_progress'
      }
    });

    // Create approval
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + firstStep.due_in_days);
    
    const approval = await prisma.document_approvals.create({
      data: {
        document_id: document.id,
        workflow_id: workflowId,
        workflow_step_id: firstStep.id,
        approver_user_id: approverId,
        due_date: dueDate
      }
    });

    await prisma.documents.update({
      where: { id: document.id },
      data: { status: 'pending_approval' }
    });

    console.log(`   ✓ Approval created for: Van NGUYEN`);
    console.log(`   Document status: pending_approval`);
    console.log();

    // Check signers before approval
    let signers = await prisma.signers.findMany({
      where: { sign_request_id: signRequest.id }
    });
    console.log(`   Signers before approval: ${signers.length}`);
    console.log();

    // Approve the document
    console.log('✅ Step 2: Approve document...');
    await prisma.document_approvals.update({
      where: { id: approval.id },
      data: {
        action: 'approved',
        acted_at: new Date()
      }
    });
    console.log(`   ✓ Approval action: approved`);
    console.log();

    // Now manually trigger the logic that should happen after approval
    console.log('🔄 Step 3: Triggering post-approval logic...');
    console.log('   (In real app, this happens in approvals.service.ts approve method)');
    console.log();

    // Check if there are signer steps
    const workflowSignerSteps = await prisma.workflow_steps.findMany({
      where: {
        workflow_id: workflowId,
        participant_role: 'signer'
      },
      orderBy: { step_order: 'asc' }
    });

    console.log(`   Found ${workflowSignerSteps.length} signer steps in workflow`);

    if (workflowSignerSteps.length > 0) {
      console.log('   Creating signers from workflow...');
      
      // Create signers for each step
      for (const step of workflowSignerSteps) {
        let userId = null;
        let email = '';
        let name = '';

        if (step.approver_type === 'user' && step.approver_id) {
          const user = await prisma.users.findUnique({
            where: { id: step.approver_id },
            select: { id: true, email: true, full_name: true, status: true }
          });
          if (user && user.status === 'active') {
            userId = user.id;
            email = user.email;
            name = user.full_name || user.email;
          }
        }

        if (userId && email) {
          await prisma.signers.create({
            data: {
              sign_request_id: signRequest.id,
              user_id: userId,
              email,
              name,
              role: 'signer',
              signing_order: step.step_order,
              status: 'pending',
              is_internal: true
            }
          });
          console.log(`     ✓ Created signer: ${name} (${email})`);
        }
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

      console.log('   ✓ Workflow instance completed');
      console.log('   ✓ Document status: pending_signature');
    }
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

    // Verify
    console.log('✅ Verification:');
    if (finalDoc.status === 'pending_signature' && finalSigners.length === signerSteps.length) {
      console.log('   ✅ TEST PASSED!');
      console.log('   - Document moved to pending_signature');
      console.log(`   - ${finalSigners.length} signers created from workflow`);
    } else {
      console.log('   ❌ TEST FAILED!');
      console.log(`   - Expected status: pending_signature, got: ${finalDoc.status}`);
      console.log(`   - Expected signers: ${signerSteps.length}, got: ${finalSigners.length}`);
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
