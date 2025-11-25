/**
 * Fix HOPDONG workflow - Set approver_id for HR step
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixHOPDONGWorkflow() {
  console.log('🔧 Fixing HOPDONG Workflow\n');

  try {
    // 1. Find approver user
    const approver = await prisma.users.findFirst({
      where: { email: 'approver@acme.local' }
    });

    if (!approver) {
      console.log('❌ Approver user not found');
      console.log('   Run: node scripts/create-approval-test-users.js');
      return;
    }

    console.log('✅ Found approver:', approver.email);
    console.log('   ID:', approver.id);
    console.log('   Name:', approver.full_name);

    // 2. Find HOPDONG workflow
    const workflow = await prisma.workflows.findFirst({
      where: { name: 'HOPDONG' },
      include: { steps: { orderBy: { step_order: 'asc' } } }
    });

    if (!workflow) {
      console.log('❌ HOPDONG workflow not found');
      return;
    }

    console.log('\n✅ Found workflow:', workflow.name);
    console.log('   ID:', workflow.id);
    console.log('   Steps:', workflow.steps.length);

    // 3. Update Step 2 (HR) with approver_id
    const hrStep = workflow.steps.find(s => s.step_name === 'HR');
    
    if (!hrStep) {
      console.log('❌ HR step not found');
      return;
    }

    console.log('\n📋 Updating Step 2 (HR)...');
    console.log('   Current approver_id:', hrStep.approver_id);
    console.log('   Current approver_type:', hrStep.approver_type);

    const updated = await prisma.workflow_steps.update({
      where: { id: hrStep.id },
      data: {
        approver_type: 'user',
        approver_id: approver.id
      }
    });

    console.log('\n✅ Updated successfully!');
    console.log('   New approver_id:', updated.approver_id);
    console.log('   New approver_type:', updated.approver_type);

    // 4. Verify
    console.log('\n🔍 Verifying...');
    const verified = await prisma.workflows.findUnique({
      where: { id: workflow.id },
      include: { steps: { orderBy: { step_order: 'asc' } } }
    });

    verified.steps.forEach((step, index) => {
      console.log(`\n   Step ${index + 1}: ${step.step_name}`);
      console.log(`   - Type: ${step.approver_type}`);
      console.log(`   - ID: ${step.approver_id || 'null'}`);
    });

    console.log('\n✅ Fix complete!');
    console.log('\n📝 Next: Refresh frontend to see changes');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

fixHOPDONGWorkflow();
