const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLatest() {
  const doc = await prisma.documents.findFirst({
    orderBy: { id: 'desc' },
    include: { 
      document_type: true,
      sign_request: true
    }
  });

  if (!doc) {
    console.log('❌ No documents found');
    return;
  }

  console.log('📄 Latest Document:');
  console.log('  ID:', doc.id);
  console.log('  Title:', doc.title || doc.original_file_name);
  console.log('  Type:', doc.document_type?.name);
  console.log('  Require Signing:', doc.document_type?.require_digital_signing);
  console.log('  Sign Request ID:', doc.sign_request_id);
  console.log('  Status:', doc.status);
  console.log('  Created:', doc.created_at);
  
  if (doc.sign_request) {
    console.log('\n📝 Sign Request:');
    console.log('  ID:', doc.sign_request.id);
    console.log('  Status:', doc.sign_request.status);
    console.log('  Auto Created:', doc.sign_request.auto_created);
  }

  await prisma.$disconnect();
}

checkLatest();
