const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function approveStep2() {
  console.log('🔧 APPROVING DOCUMENT #101 - STEP 2\n');
  
  // Find the pending approval
  const approval = await prisma.document_approvals.findFirst({
    where: {
      id: 27
    },
    include: {
      document: true,
      workflow_step: true,
      approver: true
    }
  });

  if (!approval) {
    console.log('❌ Approval not found or already processed');
    return;
  }

  console.log('📋 Approval Info:');
  console.log(`   ID: ${approval.id}`);
  console.log(`   Document: ${approval.document.document_number}`);
  console.log(`   Step: ${approval.workflow_step.step_name}`);
  console.log(`   Approver: ${approval.approver.email}`);
  console.log(`   Current Status: ${approval.action || 'pending'}`);

  // Approve it
  console.log('\n✅ Approving...');
  
  const updated = await prisma.document_approvals.update({
    where: { id: 27 },
    data: {
      action: 'approved',
      acted_at: new Date(),
      comment: 'Auto-approved for testing'
    }
  });

  console.log('✅ Approval updated!');
  console.log(`   Action: ${updated.action}`);
  console.log(`   Acted At: ${updated.acted_at}`);

  // Check if all approvals are done
  const allApprovals = await prisma.document_approvals.findMany({
    where: {
      document_id: approval.document_id
    }
  });

  const allApproved = allApprovals.every(a => a.action === 'approved');
  
  console.log('\n📊 Workflow Status:');
  console.log(`   Total Approvals: ${allApprovals.length}`);
  console.log(`   All Approved: ${allApproved ? 'Yes' : 'No'}`);

  if (allApproved) {
    console.log('\n🎉 All approvals completed!');
    console.log('   Workflow should now be completed.');
    console.log('   Signing process should start.');
    
    // Update workflow instance status
    const workflowInstance = await prisma.workflow_instances.findFirst({
      where: { document_id: approval.document_id }
    });

    if (workflowInstance) {
      await prisma.workflow_instances.update({
        where: { id: workflowInstance.id },
        data: {
          status: 'completed',
          completed_at: new Date()
        }
      });
      console.log('   ✅ Workflow instance marked as completed');
    }

    // Update document status
    await prisma.documents.update({
      where: { id: approval.document_id },
      data: { status: 'active' }
    });
    console.log('   ✅ Document status updated to "active"');

    // Update sign request status
    const signRequest = await prisma.sign_requests.findFirst({
      where: { document_id: approval.document_id }
    });

    if (signRequest) {
      await prisma.sign_requests.update({
        where: { id: signRequest.id },
        data: { status: 'pending' }
      });
      console.log('   ✅ Sign request status updated to "pending"');
    }
  }

  console.log('\n✅ Done! Document is now ready for signing.');
}

approveStep2()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
