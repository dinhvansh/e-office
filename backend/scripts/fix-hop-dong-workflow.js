const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixHopDongWorkflow() {
  console.log('🔧 Fixing Hợp đồng workflow\n');

  try {
    // Get Hợp đồng workflow
    const workflow = await prisma.workflows.findFirst({
      where: { name: 'Phê duyệt hợp đồng' },
      include: { steps: { orderBy: { step_order: 'asc' } } }
    });

    if (!workflow) {
      console.log('❌ Workflow not found');
      return;
    }

    console.log('✅ Found workflow:', workflow.name);
    console.log('   Steps:', workflow.steps.length);
    console.log('');

    // Find step with user type but no approver_id
    const brokenStep = workflow.steps.find(s => s.approver_type === 'user' && !s.approver_id);
    
    if (!brokenStep) {
      console.log('✅ All steps have approver_id');
      await prisma.$disconnect();
      return;
    }

    console.log('🔧 Found broken step:', brokenStep.step_name);
    console.log('   Step order:', brokenStep.step_order);
    console.log('');

    // Get admin user
    const admin = await prisma.users.findFirst({
      where: { email: 'admin@acme.local' }
    });

    if (!admin) {
      console.log('❌ Admin user not found');
      return;
    }

    // Update step
    await prisma.workflow_steps.update({
      where: { id: brokenStep.id },
      data: {
        approver_id: admin.id,
        step_name: 'Phê duyệt giám đốc'
      }
    });

    console.log('✅ Step updated!');
    console.log(`   Approver: ${admin.full_name || admin.email} (${admin.email})`);
    console.log('');

    await prisma.$disconnect();
    console.log('✅ Done!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

fixHopDongWorkflow();
