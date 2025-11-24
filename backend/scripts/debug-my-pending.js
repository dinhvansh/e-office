const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugMyPending() {
  console.log('🔍 Debug My Pending Query...\n');

  try {
    // 1. Get approver user
    const approver = await prisma.users.findFirst({
      where: { email: 'approver@acme.local' },
    });

    console.log('1️⃣ Approver user:');
    console.log('   ID:', approver.id);
    console.log('   Email:', approver.email);
    console.log('   Tenant ID:', approver.tenant_id);

    // 2. Count all approvals for this user
    console.log('\n2️⃣ All approvals for this user:');
    const allCount = await prisma.document_approvals.count({
      where: {
        approver_user_id: approver.id,
      },
    });
    console.log('   Total:', allCount);

    // 3. Count pending approvals
    console.log('\n3️⃣ Pending approvals:');
    const pendingCount = await prisma.document_approvals.count({
      where: {
        approver_user_id: approver.id,
        action: 'pending',
      },
    });
    console.log('   Total:', pendingCount);

    // 4. Test exact query from repository
    console.log('\n4️⃣ Test repository query:');
    const approvals = await prisma.document_approvals.findMany({
      where: {
        approver_user_id: approver.id,
        action: 'pending',
        document: {
          tenant_id: approver.tenant_id,
        },
      },
      include: {
        document: {
          select: { id: true, title: true, status: true }
        },
        workflow_step: {
          select: { step_name: true, step_order: true }
        },
        approver: {
          select: { id: true, email: true, full_name: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    console.log('   Found:', approvals.length, 'approvals');
    
    if (approvals.length > 0) {
      console.log('\n📋 Approval list:');
      approvals.forEach((a, i) => {
        console.log(`   ${i + 1}. ID: ${a.id}`);
        console.log(`      Document: ${a.document?.title}`);
        console.log(`      Step: ${a.workflow_step?.step_name}`);
        console.log(`      Status: ${a.action}`);
      });
    } else {
      console.log('\n❌ No approvals found!');
      console.log('\n🔍 Checking first approval in database:');
      const first = await prisma.document_approvals.findFirst({
        where: { action: 'pending' },
        include: {
          document: true,
          approver: true,
        },
      });
      
      if (first) {
        console.log('   Approval ID:', first.id);
        console.log('   Approver ID:', first.approver_user_id);
        console.log('   Approver email:', first.approver?.email);
        console.log('   Document tenant:', first.document?.tenant_id);
        console.log('   Expected approver ID:', approver.id);
        console.log('   Expected tenant ID:', approver.tenant_id);
        console.log('   Match?', first.approver_user_id === approver.id && first.document?.tenant_id === approver.tenant_id);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

debugMyPending();
