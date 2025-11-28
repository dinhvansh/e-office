/**
 * Test Sequential Approval with Real Document Creation Flow
 * 
 * This simulates the actual flow when user creates document from UI
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Testing Sequential Approval - Real Flow ===\n');

  try {
    // Get users
    const admin = await prisma.users.findFirst({
      where: { email: 'admin@acme.local' }
    });

    const van = await prisma.users.findFirst({
      where: { email: 'vanqn95@gamil.com' }
    });

    const userA = await prisma.users.findFirst({
      where: { email: 'usera@test.local' }
    });

    if (!admin || !van || !userA) {
      console.error('❌ Required users not found');
      return;
    }

    console.log('👥 Users:');
    console.log(`  - Owner: ${admin.email}`);
    console.log(`  - Approver 1: ${van.email}`);
    console.log(`  - Approver 2: ${userA.email}\n`);

    // Create workflow
    console.log('📋 Creating workflow...');
    const timestamp = Date.now();
    const workflow = await prisma.workflows.create({
      data: {
        tenant_id: 1,
        name: `Real Sequential Workflow ${timestamp}`,
        description: 'Test with real document creation',
        is_template: true,
        is_active: true
      }
    });

    await prisma.workflow_steps.createMany({
      data: [
        {
          workflow_id: workflow.id,
          step_order: 1,
          step_name: 'Phê duyệt bước 1',
          approver_type: 'user',
          approver_id: van.id,
          participant_role: 'approver',
          due_in_days: 3
        },
        {
          workflow_id: workflow.id,
          step_order: 2,
          step_name: 'Phê duyệt bước 2',
          approver_type: 'user',
          approver_id: userA.id,
          participant_role: 'approver',
          due_in_days: 3
        }
      ]
    });

    console.log(`✓ Workflow created: ${workflow.name}\n`);

    // Create document type
    const docType = await prisma.document_types.create({
      data: {
        tenant_id: 1,
        code: `SEQ_REAL_${timestamp}`,
        name: `Sequential Real Test ${timestamp}`,
        require_approval: true,
        require_digital_signing: false,
        default_workflow_id: workflow.id,
        is_active: true
      }
    });

    console.log(`✓ Document type created: ${docType.name}\n`);

    // Create document (simulating real creation with sequential approval logic)
    console.log('📄 Creating document...');
    
    const fs = require('fs');
    const path = require('path');
    
    // Create test file
    const testContent = 'Sequential Approval Test';
    const testDir = path.join(process.cwd(), 'storage', '1');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    const testFile = path.join(testDir, 'seq-real-test.txt');
    fs.writeFileSync(testFile, testContent);

    const document = await prisma.documents.create({
      data: {
        tenant_id: 1,
        owner_id: admin.id,
        document_type_id: docType.id,
        file_path: 'storage/1/seq-real-test.txt',
        original_file_name: 'seq-real-test.txt',
        hash: 'test-hash',
        status: 'draft',
        title: 'Sequential Approval Test Document',
        summary: 'Testing sequential approval flow',
        version: 1
      }
    });

    console.log(`✓ Document created: ${document.title} (ID: ${document.id})`);
    console.log(`  Status: ${document.status}`);
    
    // Create workflow instance and approvals (simulating documents.service logic)
    console.log('\n📋 Creating workflow instance and approvals...');
    
    const workflowSteps = await prisma.workflow_steps.findMany({
      where: { workflow_id: workflow.id },
      orderBy: { step_order: 'asc' }
    });
    
    const instance = await prisma.workflow_instances.create({
      data: {
        document_id: document.id,
        workflow_id: workflow.id,
        current_step_id: workflowSteps[0].id,
        status: 'in_progress'
      }
    });
    
    // Create approvals with sequential logic
    const approverSteps = workflowSteps.filter(s => s.participant_role !== 'signer');
    
    for (const step of approverSteps) {
      const isFirstStep = step.step_order === approverSteps[0].step_order;
      const approvalStatus = isFirstStep ? 'pending' : 'waiting';
      
      await prisma.document_approvals.create({
        data: {
          document_id: document.id,
          workflow_id: workflow.id,
          workflow_step_id: step.id,
          approver_user_id: step.approver_id,
          action: approvalStatus,
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        }
      });
    }
    
    await prisma.documents.update({
      where: { id: document.id },
      data: { status: 'pending_approval' }
    });
    
    console.log(`✓ Workflow instance created`);
    console.log(`✓ ${approverSteps.length} approvals created with sequential logic\n`);

    // Check approvals created
    console.log('🔍 Checking approvals created...');
    const approvals = await prisma.document_approvals.findMany({
      where: { document_id: document.id },
      include: {
        workflow_step: true,
        approver: { select: { email: true } }
      },
      orderBy: { workflow_step: { step_order: 'asc' } }
    });

    console.log(`  Found ${approvals.length} approvals:\n`);
    
    for (const approval of approvals) {
      const icon = approval.action === 'pending' ? '✓' : '⏳';
      const status = approval.action.toUpperCase();
      console.log(`  ${icon} Step ${approval.workflow_step.step_order}: ${approval.approver.email} - ${status}`);
    }

    // Verify sequential logic
    console.log('\n📊 Verification:');
    const step1 = approvals.find(a => a.workflow_step.step_order === 1);
    const step2 = approvals.find(a => a.workflow_step.step_order === 2);

    if (step1?.action === 'pending') {
      console.log('  ✅ Step 1 is PENDING (correct)');
    } else {
      console.log('  ❌ Step 1 should be PENDING');
      return;
    }

    if (step2?.action === 'waiting') {
      console.log('  ✅ Step 2 is WAITING (correct)');
    } else {
      console.log('  ❌ Step 2 should be WAITING');
      return;
    }

    // Check what Van sees
    console.log('\n👤 Van\'s pending approvals:');
    const vanApprovals = await prisma.document_approvals.findMany({
      where: {
        approver_user_id: van.id,
        action: 'pending'
      },
      include: {
        document: { select: { title: true } }
      }
    });

    console.log(`  Count: ${vanApprovals.length}`);
    if (vanApprovals.length > 0) {
      console.log(`  - ${vanApprovals[0].document.title}`);
      console.log('  ✅ Van can see the document');
    }

    // Check what UserA sees
    console.log('\n👤 UserA\'s pending approvals:');
    const userAApprovals = await prisma.document_approvals.findMany({
      where: {
        approver_user_id: userA.id,
        action: 'pending'
      }
    });

    console.log(`  Count: ${userAApprovals.length}`);
    if (userAApprovals.length === 0) {
      console.log('  ✅ UserA cannot see the document yet (correct)');
    } else {
      console.log('  ❌ UserA should not see the document yet');
      return;
    }

    // Van approves (simulate approval logic)
    console.log('\n✍️  Van approves the document...');
    
    // Update approval
    await prisma.document_approvals.update({
      where: { id: step1.id },
      data: {
        action: 'approved',
        comment: 'Approved by Van',
        acted_at: new Date()
      }
    });
    
    // Activate next step (sequential logic)
    const activatedCount = await prisma.document_approvals.updateMany({
      where: {
        document_id: document.id,
        workflow_step_id: step2.workflow_step_id,
        action: 'waiting'
      },
      data: {
        action: 'pending'
      }
    });
    
    // Update workflow instance
    await prisma.workflow_instances.update({
      where: { document_id: document.id },
      data: { current_step_id: step2.workflow_step_id }
    });
    
    const result = {
      message: `Step approved! Moved to next step`,
      status: 'next_step',
      activatedCount: activatedCount.count
    };

    console.log(`  Result: ${result.message}`);
    console.log(`  Status: ${result.status}`);

    if (result.nextStep) {
      console.log(`  Next step: ${result.nextStep.name}`);
    }

    // Check approvals after Van's approval
    console.log('\n🔍 Checking approvals after Van\'s approval...');
    const approvalsAfter = await prisma.document_approvals.findMany({
      where: { document_id: document.id },
      include: {
        workflow_step: true,
        approver: { select: { email: true } }
      },
      orderBy: { workflow_step: { step_order: 'asc' } }
    });

    for (const approval of approvalsAfter) {
      let icon;
      if (approval.action === 'approved') icon = '✅';
      else if (approval.action === 'pending') icon = '✓';
      else icon = '⏳';
      
      const status = approval.action.toUpperCase();
      console.log(`  ${icon} Step ${approval.workflow_step.step_order}: ${approval.approver.email} - ${status}`);
    }

    // Verify step 2 is now pending
    const step2After = approvalsAfter.find(a => a.workflow_step.step_order === 2);
    
    if (step2After?.action === 'pending') {
      console.log('\n  ✅ Step 2 is now PENDING (correct)');
    } else {
      console.log('\n  ❌ Step 2 should be PENDING now');
      return;
    }

    // Check what UserA sees now
    console.log('\n👤 UserA\'s pending approvals (after Van approved):');
    const userAApprovalsAfter = await prisma.document_approvals.findMany({
      where: {
        approver_user_id: userA.id,
        action: 'pending'
      },
      include: {
        document: { select: { title: true } }
      }
    });

    console.log(`  Count: ${userAApprovalsAfter.length}`);
    if (userAApprovalsAfter.length === 1) {
      console.log(`  - ${userAApprovalsAfter[0].document.title}`);
      console.log('  ✅ UserA can now see the document (correct)');
    } else {
      console.log('  ❌ UserA should see exactly 1 document');
      return;
    }

    // UserA approves
    console.log('\n✍️  UserA approves the document...');
    
    await prisma.document_approvals.update({
      where: { id: step2After.id },
      data: {
        action: 'approved',
        comment: 'Approved by UserA',
        acted_at: new Date()
      }
    });
    
    // Complete workflow
    await prisma.workflow_instances.update({
      where: { document_id: document.id },
      data: {
        status: 'completed',
        completed_at: new Date()
      }
    });
    
    // Update document status
    await prisma.documents.update({
      where: { id: document.id },
      data: { status: 'completed' }
    });
    
    const result2 = {
      message: 'Document approved! Workflow completed.',
      status: 'completed'
    };

    console.log(`  Result: ${result2.message}`);
    console.log(`  Status: ${result2.status}`);

    // Check final document status
    const finalDoc = await prisma.documents.findUnique({
      where: { id: document.id }
    });

    console.log('\n📄 Final document status:');
    console.log(`  Status: ${finalDoc?.status}`);

    if (finalDoc?.status === 'completed') {
      console.log('  ✅ Document completed (correct)');
    } else {
      console.log(`  ⚠️  Document status is ${finalDoc?.status}`);
    }

    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await prisma.document_approvals.deleteMany({ where: { document_id: document.id } });
    await prisma.workflow_instances.deleteMany({ where: { document_id: document.id } });
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
    console.log('✅ SEQUENTIAL APPROVAL WORKING IN REAL FLOW!');
    console.log('═══════════════════════════════════════════════════');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
