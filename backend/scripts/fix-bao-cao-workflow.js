const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixBaoCaoWorkflow() {
  console.log('🔧 Fixing Báo cáo workflow\n');

  try {
    // Get Báo cáo document type
    const docType = await prisma.document_types.findFirst({
      where: { name: 'Báo cáo' },
      include: {
        default_workflow: {
          include: { steps: { orderBy: { step_order: 'asc' } } }
        }
      }
    });

    if (!docType || !docType.default_workflow) {
      console.log('❌ Báo cáo document type or workflow not found');
      return;
    }

    console.log('✅ Found workflow:', docType.default_workflow.name);
    console.log('   Steps:', docType.default_workflow.steps.length);
    console.log('');

    // Get a user for step 3
    const user = await prisma.users.findFirst({
      where: { email: 'admin@acme.local' }
    });

    if (!user) {
      console.log('❌ Admin user not found');
      return;
    }

    // Update step 3 (user type) with approver_id
    const step3 = docType.default_workflow.steps.find(s => s.approver_type === 'user' && !s.approver_id);
    
    if (step3) {
      console.log('🔧 Updating step 3...');
      await prisma.workflow_steps.update({
        where: { id: step3.id },
        data: {
          approver_id: user.id,
          step_name: 'Phê duyệt cuối cùng'
        }
      });
      console.log(`✅ Step 3 updated with approver: ${user.email}`);
    }

    console.log('\n✅ Workflow fixed!');
    console.log('\nNow the workflow has:');
    console.log('1. Phê duyệt trưởng phòng (manager) - Depends on owner');
    console.log('2. Phê duyệt giám đốc (role: Admin) - admin@acme.local');
    console.log(`3. Phê duyệt cuối cùng (user) - ${user.email}`);

    await prisma.$disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

fixBaoCaoWorkflow();
