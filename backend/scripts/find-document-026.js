const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Search for documents with 026 in number
    const docs = await prisma.documents.findMany({
      where: {
        document_number: {
          contains: '026'
        }
      },
      select: {
        id: true,
        document_number: true,
        title: true,
        status: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    if (docs.length > 0) {
      console.log(`Found ${docs.length} document(s) with 026:\n`);
      docs.forEach(doc => {
        console.log('ID:', doc.id);
        console.log('Number:', doc.document_number);
        console.log('Title:', doc.title);
        console.log('Status:', doc.status);
        console.log('---');
      });
    } else {
      console.log('No documents found with 026');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
