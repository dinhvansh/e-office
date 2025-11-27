const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/wpsign'
    }
  }
});

async function checkWorkflow() {
  try {
    const workflow = await prisma.workflows.findUnique({
      where: { id: 3 },
      include: {
        steps: {
          orderBy: {
            step_order: 'asc'
          }
        }
      }
    });

    if (!workflow) {
      console.log('❌ Workflow not found');
      return;
    }

    console.log('\n🔄 WORKFLOW INFO:');
    console.log('ID:', workflow.id);
    console.log('Name:', workflow.name);
    console.log('Total steps:', workflow.steps.length);
    
    console.log('\n📋 WORKFLOW STEPS:');
    workflow.steps.forEach((step, index) => {
      console.log(`\n${index + 1}. Step #${step.step_order}:`);
      console.log('   ID:', step.id);
      console.log('   Name:', step.step_name);
      console.log('   Approver type:', step.approver_type);
      console.log('   Approver ID:', step.approver_id);
      console.log('   Participant role:', step.participant_role);
      console.log('   Due in days:', step.due_in_days);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWorkflow();
