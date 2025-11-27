const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSignRequest() {
  const signRequest = await prisma.sign_requests.findUnique({
    where: { id: 62 },
    include: {
      signers: true,
      document: {
        select: {
          id: true,
          title: true,
          document_number: true,
        }
      }
    }
  });
  
  console.log('Sign Request:', signRequest.id);
  console.log('Document:', signRequest.document.document_number);
  console.log('Status:', signRequest.status);
  console.log('\nSigners:', signRequest.signers.length);
  
  signRequest.signers.forEach(signer => {
    console.log(`\n${signer.signing_order}. ${signer.name}`);
    console.log(`   Email: ${signer.email}`);
    console.log(`   Role: ${signer.role}`);
    console.log(`   Internal: ${signer.is_internal}`);
    console.log(`   Status: ${signer.status}`);
  });
  
  await prisma.$disconnect();
}

checkSignRequest().catch(console.error);
