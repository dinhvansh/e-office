const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const workflows = await prisma.workflows.findMany({
    include: { steps: true }
  });
  
  console.log(`Found ${workflows.length} workflows:`);
  workflows.forEach(w => {
    console.log(`- ${w.name} (${w.steps.length} steps, active: ${w.is_active})`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());