const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkApprovalsData() {
  try {
    console.log('🔍 Checking approvals data...\n');

    // Count total approvals
    const total = await prisma.document_approvals.count();
    console.log(`Total approvals: ${total}`);

    // Count by action
    const pending = await prisma.document_approvals.count({
      where: { action: 'pending' }
    });
    console.log(`Pending: ${pending}`);

    // Get sample approvals with relations
    const approvals = await prisma.document_approvals.findMany({
      take: 5,
      include: {
        document: {
          include: {
            document_type: true,
            owner: true
          }
        },
        workflow: true,
        workflow_step: true,
        approver: true
      },
      orderBy: { created_at: 'desc' }
    });

    console.log(`\n📋 Sample approvals (${approvals.length}):`);
    approvals.forEach(a => {
      console.log(`\nID: ${a.id}`);
      console.log(`  Document: ${a.document.title || 'No title'} (#${a.document.document_number || a.document_id})`);
      console.log(`  Approver: ${a.approver.full_name || a.approver.email}`);
      console.log(`  Action: ${a.action}`);
      console.log(`  Workflow: ${a.workflow.name}`);
      console.log(`  Step: ${a.workflow_step.step_name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkApprovalsData();
