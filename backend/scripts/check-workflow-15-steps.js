const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWorkflow() {
  const workflow = await prisma.workflows.findUnique({
    where: { id: 15 },
    include: {
      steps: {
        orderBy: { step_order: 'asc' }
      }
    }
  });
  
  console.log('Workflow:', workflow.name);
  console.log('Total steps:', workflow.steps.length);
  console.log('\nSteps:');
  
  workflow.steps.forEach(step => {
    console.log(`\nStep ${step.step_order}: ${step.step_name}`);
    console.log(`  participant_role: ${step.participant_role}`);
    console.log(`  approver_type: ${step.approver_type}`);
    console.log(`  approver_id: ${step.approver_id}`);
  });
  
  const signerSteps = workflow.steps.filter(s => s.participant_role === 'signer');
  console.log(`\n✅ Signer steps: ${signerSteps.length}`);
  
  await prisma.$disconnect();
}

checkWorkflow().catch(console.error);
