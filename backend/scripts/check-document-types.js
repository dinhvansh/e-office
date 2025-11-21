const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const types = await prisma.document_types.findMany({
    where: { tenant_id: 1 },
    select: {
      id: true,
      name: true,
      require_approval: true,
      default_workflow_id: true,
      allow_workflow_override: true,
    },
  });
  
  console.log('Document Types:');
  console.log(JSON.stringify(types, null, 2));
}

main().finally(() => prisma.$disconnect());
