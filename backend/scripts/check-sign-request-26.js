const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSR26() {
  try {
    console.log('🔍 Checking Sign Request 26...\n');

    const sr = await prisma.sign_requests.findUnique({
      where: { id: 26 },
      include: { document: true, signers: true }
    });

    if (!sr) {
      console.log('❌ Sign Request 26 NOT FOUND!');
      console.log('   This is why /fields endpoint returns 500');
      return;
    }

    console.log('✅ Sign Request 26 EXISTS');
    console.log('  Status:', sr.status);
    console.log('  Document ID:', sr.document_id);
    console.log('  Document exists:', !!sr.document);
    console.log('  Signers:', sr.signers.length);
    console.log('');

    if (!sr.document) {
      console.log('❌ PROBLEM: Document not found!');
      console.log('   Document ID', sr.document_id, 'does not exist');
      console.log('   This will cause 500 error in saveFields');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSR26();
