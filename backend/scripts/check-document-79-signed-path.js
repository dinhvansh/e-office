const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const doc = await prisma.documents.findUnique({
      where: { id: 79 },
      select: {
        id: true,
        document_number: true,
        title: true,
        status: true,
        file_path: true,
        signed_file_path: true
      }
    });

    if (!doc) {
      console.log('Document not found');
      return;
    }

    console.log('Document #79:');
    console.log('  Number:', doc.document_number);
    console.log('  Title:', doc.title);
    console.log('  Status:', doc.status);
    console.log('  Original file:', doc.file_path);
    console.log('  Signed file:', doc.signed_file_path || '❌ NOT SET');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
