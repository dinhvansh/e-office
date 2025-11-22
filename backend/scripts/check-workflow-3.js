const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWorkflow() {
  const workflow = await prisma.workflows.findUnique({
    where: { id: 3 },
    include: { steps: { orderBy: { step_order: 'asc' } } }
  });
  
  console.log('Workflow 3:', JSON.stringify(workflow, null, 2));
  
  await prisma.$disconnect();
}

checkWorkflow().catch(console.error);
