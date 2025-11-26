const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDocument() {
  try {
    console.log('🔍 Checking Document 55...\n');

    const document = await prisma.documents.findUnique({
      where: { id: 55 }
    });

    if (!document) {
      console.log('❌ Document 55 NOT FOUND in database!');
      console.log('');
      console.log('This is why sign request fails.');
      console.log('The document was probably deleted or never created.');
      return;
    }

    console.log('✅ Document 55 EXISTS:');
    console.log('  Title:', document.title);
    console.log('  File path:', document.file_path);
    console.log('  Status:', document.status);
    console.log('  Owner ID:', document.owner_id);
    console.log('  Sign request ID:', document.sign_request_id);
    console.log('');

    // Check sign request
    const signRequest = await prisma.sign_requests.findUnique({
      where: { id: 23 },
      include: {
        document: true
      }
    });

    console.log('📋 Sign Request 23:');
    console.log('  Document ID:', signRequest.document_id);
    console.log('  Document loaded:', !!signRequest.document);
    
    if (!signRequest.document) {
      console.log('');
      console.log('❌ PROBLEM: Prisma cannot load document relation!');
      console.log('   This might be a Prisma cache issue.');
      console.log('');
      console.log('🔧 Try running:');
      console.log('   npx prisma generate');
      console.log('   npx prisma db push');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocument();
