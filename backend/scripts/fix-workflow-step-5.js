const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixStep() {
  // Update step 5 to have department_id = 1 (first department)
  await prisma.workflow_steps.update({
    where: { id: 5 },
    data: { approver_id: 1 }
  });
  
  console.log('✅ Updated workflow step 5 with approver_id = 1');
  
  // Check result
  const step = await prisma.workflow_steps.findUnique({ where: { id: 5 } });
  console.log('Step 5:', step);
  
  await prisma.$disconnect();
}

fixStep().catch(console.error);
