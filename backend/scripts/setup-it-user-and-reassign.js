const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function setupITUserAndReassign() {
  console.log('🔧 Setup IT user and reassign approval\n');

  try {
    // 1. Get IT user
    const itUser = await prisma.users.findFirst({
      where: { email: 'dir.it@acme.local' }
    });

    if (!itUser) {
      console.log('❌ IT user not found');
      return;
    }

    console.log('✅ Found IT user:', itUser.email);
    console.log('   ID:', itUser.id);
    console.log('');

    // 2. Set password for IT user
    console.log('🔑 Setting password for IT user...');
    const password = process.env.DEMO_ADMIN_PASSWORD;
    if (!password) throw new Error('DEMO_ADMIN_PASSWORD is required');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await prisma.users.update({
      where: { id: itUser.id },
      data: { password_hash: hashedPassword }
    });
    
    console.log('✅ Password set from DEMO_ADMIN_PASSWORD');
    console.log('');

    // 3. Get admin user
    const admin = await prisma.users.findFirst({
      where: { email: 'admin@acme.local' }
    });

    if (!admin) {
      console.log('❌ Admin user not found');
      return;
    }

    // 4. Reassign approval 22 to admin
    console.log('📋 Reassigning approval 22 to admin...');
    
    const approval = await prisma.document_approvals.findUnique({
      where: { id: 22 },
      include: {
        document: { select: { title: true } },
        workflow_step: { select: { step_name: true } }
      }
    });

    if (!approval) {
      console.log('❌ Approval 22 not found');
      return;
    }

    console.log('   Document:', approval.document?.title);
    console.log('   Step:', approval.workflow_step?.step_name);
    console.log('   Current approver:', approval.approver_user_id);
    console.log('');

    await prisma.document_approvals.update({
      where: { id: 22 },
      data: { approver_user_id: admin.id }
    });

    console.log('✅ Approval reassigned to admin');
    console.log('');

    // 5. Summary
    console.log('📊 Summary:');
    console.log('');
    console.log('✅ IT User Login:');
    console.log('   Email: dir.it@acme.local');
    console.log('   Password: supplied through DEMO_ADMIN_PASSWORD');
    console.log('');
    console.log('✅ Admin can now see approval 22 in "Phê duyệt của tôi"');
    console.log('   Document ID: 92');
    console.log('   Title: Test Document - Workflow Approval');
    console.log('');

    await prisma.$disconnect();
    console.log('✅ Done!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

setupITUserAndReassign();
