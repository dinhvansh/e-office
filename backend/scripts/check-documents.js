const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const documents = await prisma.documents.findMany({
    take: 5,
    orderBy: { id: 'desc' },
    select: {
      id: true,
      file_path: true,
      document_number: true,
      status: true,
      created_at: true,
    },
  });

  console.log('\n📄 Recent Documents:');
  console.log('='.repeat(60));
  
  if (documents.length === 0) {
    console.log('❌ No documents found. Please upload a document first.');
  } else {
    documents.forEach(doc => {
      console.log(`ID: ${doc.id}`);
      console.log(`File: ${doc.file_path}`);
      console.log(`Number: ${doc.document_number || 'N/A'}`);
      console.log(`Status: ${doc.status}`);
      console.log(`Created: ${doc.created_at}`);
      console.log('-'.repeat(60));
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
