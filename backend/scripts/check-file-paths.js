const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const documents = await prisma.documents.findMany({
    take: 3,
    orderBy: { id: 'desc' },
    select: {
      id: true,
      file_path: true,
    },
  });

  console.log('\n🔍 Checking file paths...\n');
  
  for (const doc of documents) {
    console.log(`Document ID: ${doc.id}`);
    console.log(`DB Path: ${doc.file_path}`);
    
    // Try different path resolutions
    const paths = [
      path.resolve(process.cwd(), doc.file_path),
      path.resolve(process.cwd(), doc.file_path.substring(1)),
      path.resolve(process.cwd(), 'backend', doc.file_path),
      path.resolve(process.cwd(), 'backend', doc.file_path.substring(1)),
    ];
    
    for (const p of paths) {
      const exists = fs.existsSync(p);
      console.log(`  ${exists ? '✅' : '❌'} ${p}`);
      if (exists) break;
    }
    console.log('');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
