const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  // Update step 1: Department = Phòng IT (id: 19, has manager)
  await prisma.workflow_steps.update({
    where: { id: 5 },
    data: { approver_id: 19 }
  });
  console.log('✅ Step 1: Phòng IT (Phạm Minh Tuấn)');
  
  // Step 2 already has role_id = 2, keep it
  console.log('✅ Step 2: Role Manager (already set)');
  
  // Check result
  const workflow = await prisma.workflows.findUnique({
    where: { id: 3 },
    include: { steps: { orderBy: { step_order: 'asc' } } }
  });
  
  console.log('\nWorkflow 3 steps:');
  workflow.steps.forEach(s => {
    console.log(`  ${s.step_order}. ${s.step_name} (${s.approver_type}, ID: ${s.approver_id})`);
  });
  
  await prisma.$disconnect();
}

fix().catch(console.error);
