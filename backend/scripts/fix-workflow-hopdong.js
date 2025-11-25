/**
 * Fix HOPDONG workflow - Assign approver to HR step
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixWorkflowHOPDONG() {
  try {
    console.log('🔧 Fixing HOPDONG workflow...\n');

    // Get workflow
    const workflow = await prisma.workflows.findFirst({
      where: { name: 'HOPDONG' },
      include: { steps: true }
    });

    if (!workflow) {
      throw new Error('HOPDONG workflow not found');
    }

    console.log(`✅ Found workflow: ${workflow.name} (ID: ${workflow.id})`);
    console.log(`   Steps: ${workflow.steps.length}\n`);

    // Get approver user
    const approver = await prisma.users.findUnique({
      where: { email: 'approver@acme.local' }
    });

    if (!approver) {
      throw new Error('Approver user not found');
    }

    console.log(`✅ Found approver: ${approver.full_name} (${approver.email})\n`);

    // Update HR step
    const hrStep = workflow.steps.find(s => s.step_name === 'HR');
    
    if (!hrStep) {
      throw new Error('HR step not found');
    }

    console.log(`📝 Updating step: ${hrStep.step_name} (ID: ${hrStep.id})`);
    console.log(`   Current approver_id: ${hrStep.approver_id}`);

    await prisma.workflow_steps.update({
      where: { id: hrStep.id },
      data: {
        approver_id: approver.id
      }
    });

    console.log(`   ✅ Updated approver_id: ${approver.id}\n`);

    console.log('🎉 Done! Workflow fixed.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixWorkflowHOPDONG();
