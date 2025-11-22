const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const dept = await prisma.departments.findUnique({
    where: { id: 1 },
    include: { manager: true }
  });
  
  console.log('Department 1:', JSON.stringify(dept, null, 2));
  
  await prisma.$disconnect();
}

check().catch(console.error);
