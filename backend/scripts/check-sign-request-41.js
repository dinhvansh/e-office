const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const sr = await prisma.sign_requests.findUnique({
    where: { id: 41 },
    select: { id: true, status: true, title: true }
  });
  
  console.log('Sign Request #41:', sr);
  await prisma.$disconnect();
}

check().catch(console.error);
