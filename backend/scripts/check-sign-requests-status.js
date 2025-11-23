const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const signRequests = await prisma.sign_requests.findMany({
    include: {
      signers: true,
      fields: true,
    },
    orderBy: {
      created_at: 'desc',
    },
    take: 5,
  });
  
  console.log('📋 Recent sign requests:\n');
  
  if (signRequests.length === 0) {
    console.log('❌ No sign requests found');
    return;
  }
  
  signRequests.forEach((sr, i) => {
    console.log(`${i + 1}. ID: ${sr.id}`);
    console.log(`   Status: ${sr.status}`);
    console.log(`   Fields: ${sr.fields.length}`);
    console.log(`   Signers: ${sr.signers.length}`);
    if (sr.signers.length > 0) {
      console.log(`   First signer: ${sr.signers[0].email}`);
      console.log(`   Token: ${sr.signers[0].signing_token}`);
    }
    console.log('');
  });
  
  await prisma.$disconnect();
}

check();
