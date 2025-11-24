const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixWorkflowStepOrder() {
  console.log('🔧 Fixing workflow step orders\n');

  try {
    // Get all workflows
    const workflows = await prisma.workflows.findMany({
      include: {
        steps: {
          orderBy: { step_order: 'asc' }
        }
      }
    });

    console.log(`Found ${workflows.length} workflows\n`);

    for (const workflow of workflows) {
      if (workflow.steps.length === 0) continue;

      console.log(`📋 Workflow: ${workflow.name}`);
      console.log(`   Steps: ${workflow.steps.length}`);
      
      // Check if steps are sequential (1, 2, 3...)
      const isSequential = workflow.steps.every((step, idx) => step.step_order === idx + 1);
      
      if (isSequential) {
        console.log('   ✅ Steps are already sequential');
      } else {
        console.log('   ⚠️  Steps are NOT sequential, fixing...');
        
        // Reorder steps
        for (let i = 0; i < workflow.steps.length; i++) {
          const step = workflow.steps[i];
          const newOrder = i + 1;
          
          if (step.step_order !== newOrder) {
            await prisma.workflow_steps.update({
              where: { id: step.id },
              data: { step_order: newOrder }
            });
            console.log(`      Step "${step.step_name}": ${step.step_order} → ${newOrder}`);
          }
        }
        
        console.log('   ✅ Fixed!');
      }
      console.log('');
    }

    console.log('✅ All workflows fixed!');
    await prisma.$disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

fixWorkflowStepOrder();
