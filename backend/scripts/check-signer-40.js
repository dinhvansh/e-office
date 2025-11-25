const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSigner() {
  const signers = await prisma.signers.findMany({
    where: { sign_request_id: 40 },
    select: {
      id: true,
      email: true,
      name: true,
      is_internal: true,
      signing_token: true,
      status: true
    }
  });

  console.log('Signers for Sign Request #40:');
  console.log(JSON.stringify(signers, null, 2));

  await prisma.$disconnect();
}

checkSigner().catch(console.error);
