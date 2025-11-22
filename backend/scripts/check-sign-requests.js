const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSignRequests() {
  const signRequests = await prisma.sign_requests.findMany({
    include: {
      signers: true,
      document: {
        select: { id: true, title: true, original_file_name: true }
      }
    },
    orderBy: { id: 'desc' },
    take: 10
  });
  
  console.log('\n📋 Recent Sign Requests (last 10):');
  console.log('═'.repeat(80));
  
  signRequests.forEach(sr => {
    console.log(`\nID: ${sr.id} | Status: ${sr.status} | Document: ${sr.document_id}`);
    console.log(`  Title: ${sr.title || 'N/A'}`);
    console.log(`  Doc: ${sr.document?.original_file_name || sr.document?.title || 'N/A'}`);
    console.log(`  Signers: ${sr.signers.length}`);
    sr.signers.forEach(s => {
      console.log(`    - ${s.name} (${s.email}) [order: ${s.signing_order || 'N/A'}]`);
    });
  });
  
  console.log('\n' + '═'.repeat(80));
  console.log(`Total: ${signRequests.length} sign requests\n`);
  
  await prisma.$disconnect();
}

checkSignRequests().catch(console.error);
