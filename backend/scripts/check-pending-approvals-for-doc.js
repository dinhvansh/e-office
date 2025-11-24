const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPendingApprovals(documentId) {
  try {
    console.log(`🔍 Checking Pending Approvals for Document #${documentId}\n`);

    const approvals = await prisma.document_approvals.findMany({
      where: { 
        document_id: documentId
      },
      include: {
        approver: true,
        workflow_step: true
      },
      orderBy: { created_at: 'asc' }
    });

    if (approvals.length === 0) {
      console.log('❌ No approvals found for this document');
      return;
    }

    console.log(`Found ${approvals.length} approval(s):\n`);

    approvals.forEach((a, i) => {
      const icon = a.action === 'approved' ? '✅' : 
                   a.action === 'rejected' ? '❌' :
                   a.action === 'info_requested' ? '❓' : '⏳';
      
      console.log(`${icon} Approval #${a.id}`);
      console.log(`   Approver: ${a.approver.full_name || a.approver.email}`);
      console.log(`   Email: ${a.approver.email}`);
      console.log(`   Step: ${a.workflow_step.step_name} (Order ${a.workflow_step.step_order})`);
      console.log(`   Action: ${a.action}`);
      console.log(`   Comment: ${a.comment || 'N/A'}`);
      console.log(`   Due Date: ${a.due_date ? a.due_date.toLocaleString('vi-VN') : 'N/A'}`);
      if (a.acted_at) {
        console.log(`   Acted At: ${a.acted_at.toLocaleString('vi-VN')}`);
      }
      console.log('');
    });

    const pending = approvals.filter(a => a.action === 'pending');
    const approved = approvals.filter(a => a.action === 'approved');
    const rejected = approvals.filter(a => a.action === 'rejected');

    console.log('━'.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`   Total: ${approvals.length}`);
    console.log(`   Pending: ${pending.length}`);
    console.log(`   Approved: ${approved.length}`);
    console.log(`   Rejected: ${rejected.length}`);

    if (pending.length > 0) {
      console.log('\n⏳ Pending Approvals:');
      pending.forEach(a => {
        console.log(`   - ${a.approver.email} (${a.workflow_step.step_name})`);
      });
      console.log('\n💡 Action: Login as one of the pending approvers and approve the document');
    } else if (approved.length === approvals.length) {
      console.log('\n✅ All approvals completed!');
      console.log('💡 Document should move to signing phase automatically');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const documentId = parseInt(process.argv[2]) || 96;
checkPendingApprovals(documentId);
