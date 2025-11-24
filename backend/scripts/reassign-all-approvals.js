const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reassignAllApprovals() {
  console.log('🔧 Reassigning all pending approvals...\n');

  try {
    // 1. Get approver user
    const approver = await prisma.users.findFirst({
      where: { email: 'approver@acme.local' },
    });

    if (!approver) {
      console.log('❌ Approver user not found');
      return;
    }

    console.log('✅ Found approver:', approver.email, '(ID:', approver.id + ')');

    // 2. Get all pending approvals
    const pending = await prisma.document_approvals.findMany({
      where: { action: 'pending' },
      include: {
        document: { select: { title: true } },
      },
    });

    console.log('✅ Found', pending.length, 'pending approvals\n');

    // 3. Update all to new approver
    for (const approval of pending) {
      await prisma.document_approvals.update({
        where: { id: approval.id },
        data: { approver_user_id: approver.id },
      });
      console.log(`   ✅ Updated approval ${approval.id}: ${approval.document.title}`);
    }

    console.log('\n🎉 Done! All pending approvals reassigned to', approver.email);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

reassignAllApprovals();
