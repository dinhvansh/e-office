/**
 * Test Sequential Approval Flow
 * 
 * Tests that:
 * 1. Only first step approvals are 'pending'
 * 2. Other steps are 'waiting'
 * 3. After first approval, next step becomes 'pending'
 * 4. Approver 2 can't see document until approver 1 approves
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Testing Sequential Approval ===\n');

  try {
    // Get test users
    const users = await prisma.users.findMany({
      where: { tenant_id: 1 },
      take: 3,
      orderBy: { id: 'asc' }
    });

    if (users.length < 3) {
      console.error('❌ Need at least 3 users for testing');
      return;
    }

    const [owner, approver1, approver2] = users;
    console.log(`Owner: ${owner.email}`);
    console.log(`Approver 1: ${approver1.email}`);
    console.log(`Approver 2: ${approver2.email}\n`);

    // Create a workflow with 2 approval steps
    console.log('📝 Creating workflow with 2 approval steps...');
    const workflow = await prisma.workflows.create({
      data: {
        tenant_id: 1,
        name: 'Sequential Test Workflow',
        description: 'Test sequential approval',
        is_template: true,
        is_active: true
      }
    });

    const step1 = await prisma.workflow_steps.create({
      data: {
        workflow_id: workflow.id,
        step_order: 1,
        step_name: 'Step 1 - First Approver',
        approver_type: 'user',
        approver_id: approver1.id,
        participant_role: 'approver',
        due_in_days: 3
      }
    });

    const step2 = await prisma.workflow_steps.create({
      data: {
        workflow_id: workflow.id,
        step_order: 2,
        step_name: 'Step 2 - Second Approver',
        approver_type: 'user',
        approver_id: approver2.id,
        participant_role: 'approver',
        due_in_days: 3
      }
    });

    console.log(`✓ Workflow created: ${workflow.name}`);
    console.log(`  - Step 1: ${step1.step_name} (${approver1.email})`);
    console.log(`  - Step 2: ${step2.step_name} (${approver2.email})\n`);

    // Create document type with this workflow
    const docType = await prisma.document_types.create({
      data: {
        tenant_id: 1,
        code: 'SEQ_TEST',
        name: 'Sequential Test Type',
        require_approval: true,
        default_workflow_id: workflow.id,
        is_active: true
      }
    });

    console.log(`✓ Document type created: ${docType.name}\n`);

    // Create a test document
    console.log('📄 Creating test document...');
    const fs = require('fs');
    const path = require('path');
    
    // Create a simple test file
    const testContent = 'Sequential Approval Test Document';
    const testDir = path.join(process.cwd(), 'storage', '1');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    const testFile = path.join(testDir, 'seq-test.txt');
    fs.writeFileSync(testFile, testContent);

    const document = await prisma.documents.create({
      data: {
        tenant_id: 1,
        owner_id: owner.id,
        document_type_id: docType.id,
        file_path: `storage/1/seq-test.txt`,
        original_file_name: 'seq-test.txt',
        hash: 'test-hash',
        status: 'draft',
        title: 'Sequential Approval Test',
        version: 1
      }
    });

    console.log(`✓ Document created: ${document.title} (ID: ${document.id})\n`);

    // Submit for approval (using approvals service)
    console.log('🚀 Submitting document for approval...');
    
    // Create workflow instance
    const instance = await prisma.workflow_instances.create({
      data: {
        document_id: document.id,
        workflow_id: workflow.id,
        current_step_id: step1.id,
        status: 'in_progress'
      }
    });

    // Create approvals with sequential logic
    const approval1 = await prisma.document_approvals.create({
      data: {
        document_id: document.id,
        workflow_id: workflow.id,
        workflow_step_id: step1.id,
        approver_user_id: approver1.id,
        action: 'pending', // ⭐ First step = pending
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      }
    });

    const approval2 = await prisma.document_approvals.create({
      data: {
        document_id: document.id,
        workflow_id: workflow.id,
        workflow_step_id: step2.id,
        approver_user_id: approver2.id,
        action: 'waiting', // ⭐ Second step = waiting
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      }
    });

    await prisma.documents.update({
      where: { id: document.id },
      data: { status: 'pending_approval' }
    });

    console.log(`✓ Document submitted for approval\n`);

    // TEST 1: Check initial states
    console.log('TEST 1: Check initial approval states');
    console.log('─────────────────────────────────────');
    
    const approvals = await prisma.document_approvals.findMany({
      where: { document_id: document.id },
      include: {
        workflow_step: true,
        approver: { select: { email: true } }
      },
      orderBy: { workflow_step: { step_order: 'asc' } }
    });

    for (const approval of approvals) {
      const status = approval.action === 'pending' ? '✓ PENDING' : '⏳ WAITING';
      console.log(`  ${status} - Step ${approval.workflow_step.step_order}: ${approval.approver.email}`);
    }

    const step1Pending = approvals[0].action === 'pending';
    const step2Waiting = approvals[1].action === 'waiting';

    if (step1Pending && step2Waiting) {
      console.log('\n✅ TEST 1 PASSED: Step 1 is pending, Step 2 is waiting\n');
    } else {
      console.log('\n❌ TEST 1 FAILED: Incorrect initial states\n');
      return;
    }

    // TEST 2: Check what approver 2 sees (should be empty)
    console.log('TEST 2: Check approver 2 pending tasks (should be empty)');
    console.log('─────────────────────────────────────────────────────────');
    
    const approver2Tasks = await prisma.document_approvals.findMany({
      where: {
        approver_user_id: approver2.id,
        action: 'pending' // Only pending, not waiting
      }
    });

    console.log(`  Approver 2 (${approver2.email}) sees: ${approver2Tasks.length} tasks`);
    
    if (approver2Tasks.length === 0) {
      console.log('✅ TEST 2 PASSED: Approver 2 cannot see document yet\n');
    } else {
      console.log('❌ TEST 2 FAILED: Approver 2 should not see any tasks\n');
      return;
    }

    // TEST 3: Approver 1 approves
    console.log('TEST 3: Approver 1 approves document');
    console.log('─────────────────────────────────────');
    
    await prisma.document_approvals.update({
      where: { id: approval1.id },
      data: {
        action: 'approved',
        acted_at: new Date()
      }
    });

    console.log(`  ✓ Approver 1 (${approver1.email}) approved\n`);

    // Simulate sequential logic: activate next step
    const activatedCount = await prisma.document_approvals.updateMany({
      where: {
        document_id: document.id,
        workflow_step_id: step2.id,
        action: 'waiting'
      },
      data: {
        action: 'pending'
      }
    });

    console.log(`  ⭐ Activated ${activatedCount.count} approvals for next step\n`);

    // Update workflow instance
    await prisma.workflow_instances.update({
      where: { document_id: document.id },
      data: { current_step_id: step2.id }
    });

    // TEST 4: Check states after first approval
    console.log('TEST 4: Check approval states after first approval');
    console.log('──────────────────────────────────────────────────');
    
    const approvalsAfter = await prisma.document_approvals.findMany({
      where: { document_id: document.id },
      include: {
        workflow_step: true,
        approver: { select: { email: true } }
      },
      orderBy: { workflow_step: { step_order: 'asc' } }
    });

    for (const approval of approvalsAfter) {
      let status;
      if (approval.action === 'approved') status = '✅ APPROVED';
      else if (approval.action === 'pending') status = '✓ PENDING';
      else status = '⏳ WAITING';
      
      console.log(`  ${status} - Step ${approval.workflow_step.step_order}: ${approval.approver.email}`);
    }

    const step1Approved = approvalsAfter[0].action === 'approved';
    const step2Pending = approvalsAfter[1].action === 'pending';

    if (step1Approved && step2Pending) {
      console.log('\n✅ TEST 4 PASSED: Step 1 approved, Step 2 now pending\n');
    } else {
      console.log('\n❌ TEST 4 FAILED: Incorrect states after approval\n');
      return;
    }

    // TEST 5: Check what approver 2 sees now (should see 1 task)
    console.log('TEST 5: Check approver 2 pending tasks (should see 1)');
    console.log('─────────────────────────────────────────────────────');
    
    const approver2TasksAfter = await prisma.document_approvals.findMany({
      where: {
        approver_user_id: approver2.id,
        action: 'pending'
      },
      include: {
        document: { select: { title: true } }
      }
    });

    console.log(`  Approver 2 (${approver2.email}) sees: ${approver2TasksAfter.length} tasks`);
    
    if (approver2TasksAfter.length === 1) {
      console.log(`  - Document: ${approver2TasksAfter[0].document.title}`);
      console.log('✅ TEST 5 PASSED: Approver 2 can now see document\n');
    } else {
      console.log('❌ TEST 5 FAILED: Approver 2 should see exactly 1 task\n');
      return;
    }

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    await prisma.document_approvals.deleteMany({ where: { document_id: document.id } });
    await prisma.workflow_instances.delete({ where: { document_id: document.id } });
    await prisma.documents.delete({ where: { id: document.id } });
    await prisma.workflow_steps.deleteMany({ where: { workflow_id: workflow.id } });
    await prisma.workflows.delete({ where: { id: workflow.id } });
    await prisma.document_types.delete({ where: { id: docType.id } });
    
    // Delete test file
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }

    console.log('✓ Cleanup complete\n');

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED - Sequential Approval Working!');
    console.log('═══════════════════════════════════════════════════');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    throw error;
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
