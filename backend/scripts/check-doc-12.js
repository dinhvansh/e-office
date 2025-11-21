const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const doc = await prisma.documents.findUnique({
    where: { id: 12 },
  });

  if (!doc) {
    console.log('❌ Document 12 not found');
    return;
  }

  console.log('\n📄 Document 12:');
  console.log('File path:', doc.file_path);
  console.log('Status:', doc.status);
  
  // Check if file exists
  const filePath = path.resolve(process.cwd(), doc.file_path);
  const exists = fs.existsSync(filePath);
  
  console.log('Resolved path:', filePath);
  console.log('File exists:', exists);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
