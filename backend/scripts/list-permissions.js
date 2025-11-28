const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const perms = await prisma.permissions.findMany();
  console.log('📋 Existing permissions:');
  perms.forEach(p => console.log(`   ${p.resource}.${p.action}`));
  await prisma.$disconnect();
}

main();
