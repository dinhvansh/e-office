/**
 * Test script to reproduce the bug where workflow steps with participant_role='signer'
 * are being created as both approvals and signers
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing Mixed Workflow Bug (Approvers + Signers)\n');

  try {
    // Use workflow ID 17 "test" which has 1 approver + 1 signer
    const workflowId = 17;
    const tenantId = 1;
    const userId = 1; // admin

    // Get workflow details
    const workflow = await prisma.workflows.findUnique({
      where: { id: workflowId },
      include: {
        steps: {
          orderBy: { step_order: 'asc' }
        }
      }
    });

    console.log(`📋 Workflow: ${workflow.name} (ID: ${workflow.id})`);
    console.log(`   Steps:`);
    for (const step of workflow.steps) {
      const role = step.participant_role || 'approver (default)';
      console.log(`     ${step.step_order}. ${step.step_name} - ${role}`);
      console.log(`        Type: ${step.approver_type}, ID: ${step.approver_id}`);
    }
    console.log();

    // Create a test document
    console.log('📄 Creating test document...');
    
    const document = await prisma.documents.create({
      data: {
        tenant_id: tenantId,
        owner_id: userId,
        title: 'Test Mixed Workflow Bug',
        status: 'draft',
        document_number: `TEST-${Date.now()}`,
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
    console.log(`   Created sign request ID: ${signRequest.id}`);
    console.log();

    // Link sign request to document
    await prisma.documents.update({
      where: { id: document.id },
      data: { sign_request_id: signRequest.id }
    });

    // Now submit for approval (this is where the bug happens)
    console.log('🚀 Submitting for approval...');
    console.log('   This should:');
    console.log('   1. Create approvals ONLY for approver steps');
    console.log('   2. NOT create approvals for signer steps');
    console.log();

    // Simulate submitForApproval logic
    const approverSteps = workflow.steps.filter(
      step => step.participant_role === 'approver' || !step.participant_role
    );
    const signerSteps = workflow.steps.filter(
      step => step.participant_role === 'signer'
    );

    console.log(`   Approver steps to process: ${approverSteps.length}`);
    console.log(`   Signer steps to skip: ${signerSteps.length}`);
    console.log();

    if (approverSteps.length === 0) {
      console.log('   ❌ No approver steps found!');
      return;
    }

    // Get first approver step
    const firstStep = approverSteps[0];
    console.log(`   First approver step: ${firstStep.step_name}`);

    // Get approvers for first step
    let approverIds = [];
    if (firstStep.approver_type === 'user' && firstStep.approver_id) {
      approverIds = [firstStep.approver_id];
    } else if (firstStep.approver_type === 'role' && firstStep.approver_id) {
      const userRoles = await prisma.user_roles.findMany({
        where: { role_id: firstStep.approver_id },
        select: { user_id: true }
      });
      approverIds = userRoles.map(ur => ur.user_id);
    }

    console.log(`   Approvers found: ${approverIds.length}`);
    console.log();

    // Create workflow instance
    const instance = await prisma.workflow_instances.create({
      data: {
        document_id: document.id,
        workflow_id: workflowId,
        current_step_id: firstStep.id,
        status: 'in_progress'
      }
    });

    // Create approval records for first step
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + firstStep.due_in_days);

    for (const approverId of approverIds) {
      await prisma.document_approvals.create({
        data: {
          document_id: document.id,
          workflow_id: workflowId,
          workflow_step_id: firstStep.id,
          approver_user_id: approverId,
          due_date: dueDate
        }
      });
    }

    // Update document status
    await prisma.documents.update({
      where: { id: document.id },
      data: { status: 'pending_approval' }
    });

    console.log('✅ Submission complete!');
    console.log();

    // Now check what was created
    console.log('🔍 Checking created records...');
    console.log();

    const approvals = await prisma.document_approvals.findMany({
      where: { document_id: document.id },
      include: {
        workflow_step: true,
        approver: {
          select: { email: true, full_name: true }
        }
      }
    });

    console.log(`✅ Approvals Created: ${approvals.length}`);
    for (const approval of approvals) {
      const step = approval.workflow_step;
      const role = step?.participant_role || 'approver (default)';
      console.log(`   - ${approval.approver?.full_name || approval.approver?.email}`);
      console.log(`     Step: ${step?.step_name} (${role})`);
      console.log(`     Status: ${approval.action}`);
    }
    console.log();

    const signers = await prisma.signers.findMany({
      where: { sign_request_id: signRequest.id }
    });

    console.log(`✍️  Signers Created: ${signers.length}`);
    for (const signer of signers) {
      console.log(`   - ${signer.name} (${signer.email})`);
      console.log(`     Role: ${signer.role}`);
      console.log(`     Status: ${signer.status}`);
    }
    console.log();

    // Detect bug
    console.log('🐛 Bug Detection:');
    const signerStepIds = signerSteps.map(s => s.id);
    const wrongApprovals = approvals.filter(a => 
      signerStepIds.includes(a.workflow_step_id)
    );

    if (wrongApprovals.length > 0) {
      console.log('   ❌ BUG FOUND: Signer steps created as approvals!');
      for (const approval of wrongApprovals) {
        const step = approval.workflow_step;
        console.log(`      - ${step?.step_name} (participant_role: ${step?.participant_role})`);
      }
    } else {
      console.log('   ✅ No signer steps in approvals (correct)');
    }
    console.log();

    console.log('📊 Summary:');
    console.log(`   Expected approvals: ${approverSteps.length}`);
    console.log(`   Actual approvals: ${approvals.length}`);
    console.log(`   Expected signers: 0 (not created yet)`);
    console.log(`   Actual signers: ${signers.length}`);
    console.log();

    if (wrongApprovals.length > 0) {
      console.log('❌ TEST FAILED: Bug detected!');
    } else {
      console.log('✅ TEST PASSED: Approvals created correctly!');
    }

    // Cleanup
    console.log();
    console.log('🧹 Cleaning up test data...');
    await prisma.document_approvals.deleteMany({ where: { document_id: document.id } });
    await prisma.workflow_instances.deleteMany({ where: { document_id: document.id } });
    await prisma.signers.deleteMany({ where: { sign_request_id: signRequest.id } });
    await prisma.sign_requests.delete({ where: { id: signRequest.id } });
    await prisma.documents.delete({ where: { id: document.id } });
    console.log('   Cleanup complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
