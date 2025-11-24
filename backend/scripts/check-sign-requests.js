const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSignRequests() {
  try {
    const requests = await prisma.sign_requests.findMany({
      include: {
        signers: {
          select: {
            id: true,
            email: true,
            signing_token: true,
            status: true,
          }
        },
        document: {
          select: {
            id: true,
            title: true,
          }
        }
      },
      orderBy: { id: 'desc' },
      take: 5,
    });

    console.log('📋 Recent sign requests:');
    requests.forEach(r => {
      console.log(`\nID: ${r.id}, Status: ${r.status}`);
      console.log(`Document: ${r.document?.title || 'No title'}`);
      console.log(`Signers: ${r.signers.length}`);
      r.signers.forEach(s => {
        console.log(`  - ${s.email} (${s.status}) Token: ${s.signing_token ? 'Yes' : 'No'}`);
      });
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSignRequests();