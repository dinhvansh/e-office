const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function list() {
  const depts = await prisma.departments.findMany({
    include: { manager: { select: { id: true, email: true, full_name: true } } },
    take: 10
  });
  
  console.log('Departments:');
  depts.forEach(d => {
    console.log(`  ${d.id}. ${d.name} (${d.code})`);
    console.log(`     Manager: ${d.manager ? `${d.manager.full_name} (${d.manager.email})` : 'None'}`);
  });
  
  await prisma.$disconnect();
}

list().catch(console.error);
