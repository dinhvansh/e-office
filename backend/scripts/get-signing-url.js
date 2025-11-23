const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://esign:esignpass@localhost:5432/esign',
    },
  },
});

async function getSigningUrl() {
  const signRequestId = parseInt(process.argv[2]) || 40;
  
  const signers = await prisma.signers.findMany({
    where: { sign_request_id: signRequestId },
    select: {
      id: true,
      name: true,
      email: true,
      signing_token: true,
      status: true,
    },
  });

  console.log(`\n📧 Signing URLs for Sign Request #${signRequestId}:\n`);
  console.log('═'.repeat(80));
  
  signers.forEach((signer, index) => {
    console.log(`\n${index + 1}. ${signer.name} (${signer.email})`);
    console.log(`   Status: ${signer.status}`);
    console.log(`   URL: http://localhost:3000/sign/${signer.signing_token}`);
  });
  
  console.log('\n' + '═'.repeat(80));
  console.log(`\n✅ Total: ${signers.length} signers\n`);
  
  await prisma.$disconnect();
}

getSigningUrl().catch(console.error);
