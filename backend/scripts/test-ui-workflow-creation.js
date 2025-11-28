/**
 * Test workflow creation from UI with participant_role
 * Simulates user creating workflow with mixed approver and signer steps
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing UI Workflow Creation with participant_role\n');

  try {
    const tenantId = 1;
    const userId = 1; // admin

    // STEP 1: Create workflow (simulating UI)
    console.log('📋 STEP 1: Creating workflow with mixed steps...');
    
    const workflow = await prisma.workflows.create({
      data: {
        tenant_id: tenantId,
        name: 'Test UI Workflow',
        description: 'Workflow created from UI with approver and signer',
        created_by: userId,
        is_active: true
      }
    });
    console.log(`   ✓ Workflow created: ${workflow.name} (ID: ${workflow.id})`);

    // STEP 2: Add steps with participant_role (simulating UI form submission)
    console.log('\n📝 STEP 2: Adding workflow steps...');
    
    // Step 1: Approver
    const step1 = await prisma.workflow_steps.create({
      data: {
        workflow_id: workflow.id,
        step_order: 1,
        step_name: 'Phê duyệt - Trưởng phòng',
        approver_type: 'user',
        approver_id: 6, // Van NGUYEN
        participant_role: 'approver', // ✅ UI sends this
        due_in_days: 3
      }
    });
    console.log(`   ✓ Step 1: ${step1.step_name} - Role: ${step1.participant_role}`);

    // Step 2: Signer
    const step2 = await prisma.workflow_steps.create({
      data: {
        workflow_id: workflow.id,
        step_order: 2,
        step_name: 'Ký - Giám đốc',
        approver_type: 'user',
        approver_id: 1, // admin
        participant_role: 'signer', // ✅ UI sends this
        due_in_days: 3
      }
    });
    console.log(`   ✓ Step 2: ${step2.step_name} - Role: ${step2.participant_role}`);

    // Step 3: Another approver
    const step3 = await prisma.workflow_steps.create({
      data: {
        workflow_id: workflow.id,
        step_order: 3,
        step_name: 'Phê duyệt cuối - CEO',
        approver_type: 'user',
        approver_id: 6,
        participant_role: 'approver', // ✅ UI sends this
        due_in_days: 5
      }
    });
    console.log(`   ✓ Step 3: ${step3.step_name} - Role: ${step3.participant_role}`);

    // STEP 3: Create document with this workflow
    console.log('\n📄 STEP 3: Creating document with workflow...');
    
    const document = await prisma.documents.create({
      data: {
        tenant_id: tenantId,
        owner_id: userId,
        title: 'Test Document with UI Workflow',
        status: 'draft',
        document_number: `UITEST-${Date.now()}`,
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

    // STEP 4: Simulate backend processing (documents.service.ts logic)
    console.log('\n🔄 STEP 4: Backend processing workflow...');
    
    // Get workflow with steps
    const workflowWithSteps = await prisma.workflows.findUnique({
      where: { id: workflow.id },
      include: {
        steps: {
          orderBy: { step_order: 'asc' }
        }
      }
    });

    console.log(`   Workflow has ${workflowWithSteps.steps.length} steps`);

    // Create workflow instance
    const instance = await prisma.workflow_instances.create({
      data: {
        document_id: document.id,
        workflow_id: workflow.id,
        current_step_id: workflowWithSteps.steps[0].id,
        status: 'in_progress'
      }
    });
    console.log(`   ✓ Workflow instance created`);

    // ✅ Create approvals ONLY for approver steps
    let approvalCount = 0;
    for (const step of workflowWithSteps.steps) {
      if (step.participant_role === 'signer') {
        console.log(`   ⏭️  Skipping signer step: ${step.step_name}`);
        continue;
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + step.due_in_days);

      await prisma.document_approvals.create({
        data: {
          document_id: document.id,
          workflow_id: workflow.id,
          workflow_step_id: step.id,
          approver_user_id: step.approver_id,
          due_date: dueDate
        }
      });
      console.log(`   ✓ Created approval for: ${step.step_name}`);
      approvalCount++;
    }

    // ✅ Create signers ONLY for signer steps
    let signerCount = 0;
    for (const step of workflowWithSteps.steps) {
      if (step.participant_role !== 'signer') {
        console.log(`   ⏭️  Skipping approver step: ${step.step_name}`);
        continue;
      }

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
            status: 'waiting_approval',
            is_internal: true
          }
        });
        console.log(`   ✓ Created signer for: ${step.step_name}`);
        signerCount++;
      }
    }

    await prisma.documents.update({
      where: { id: document.id },
      data: { status: 'pending_approval' }
    });

    // STEP 5: Verify results
    console.log('\n📊 STEP 5: Verification...');
    
    const finalApprovals = await prisma.document_approvals.findMany({
      where: { document_id: document.id },
      include: {
        workflow_step: true
      }
    });

    const finalSigners = await prisma.signers.findMany({
      where: { sign_request_id: signRequest.id }
    });

    console.log(`\n✅ Results:`);
    console.log(`   Workflow steps: ${workflowWithSteps.steps.length}`);
    console.log(`     - Approver steps: ${workflowWithSteps.steps.filter(s => s.participant_role === 'approver' || !s.participant_role).length}`);
    console.log(`     - Signer steps: ${workflowWithSteps.steps.filter(s => s.participant_role === 'signer').length}`);
    console.log(`   Approvals created: ${finalApprovals.length}`);
    console.log(`   Signers created: ${finalSigners.length}`);

    // Check for duplicates
    console.log(`\n🔍 Checking for duplicates...`);
    
    const approverStepIds = workflowWithSteps.steps
      .filter(s => s.participant_role === 'approver' || !s.participant_role)
      .map(s => s.id);
    
    const signerStepIds = workflowWithSteps.steps
      .filter(s => s.participant_role === 'signer')
      .map(s => s.id);

    const wrongApprovals = finalApprovals.filter(a => 
      signerStepIds.includes(a.workflow_step_id)
    );

    if (wrongApprovals.length > 0) {
      console.log(`   ❌ BUG: Found ${wrongApprovals.length} approvals for signer steps!`);
      for (const approval of wrongApprovals) {
        console.log(`      - ${approval.workflow_step.step_name}`);
      }
    } else {
      console.log(`   ✅ No approvals for signer steps (correct)`);
    }

    // Check if signers match signer steps
    const expectedSigners = workflowWithSteps.steps.filter(s => s.participant_role === 'signer').length;
    if (finalSigners.length === expectedSigners) {
      console.log(`   ✅ Correct number of signers created`);
    } else {
      console.log(`   ❌ Expected ${expectedSigners} signers, got ${finalSigners.length}`);
    }

    // Final verdict
    console.log(`\n${wrongApprovals.length === 0 && finalSigners.length === expectedSigners ? '✅ TEST PASSED!' : '❌ TEST FAILED!'}`);

    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await prisma.document_approvals.deleteMany({ where: { document_id: document.id } });
    await prisma.workflow_instances.deleteMany({ where: { document_id: document.id } });
    await prisma.signers.deleteMany({ where: { sign_request_id: signRequest.id } });
    await prisma.sign_requests.delete({ where: { id: signRequest.id } });
    await prisma.documents.delete({ where: { id: document.id } });
    await prisma.workflow_steps.deleteMany({ where: { workflow_id: workflow.id } });
    await prisma.workflows.delete({ where: { id: workflow.id } });
    console.log('   ✓ Cleanup complete');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
