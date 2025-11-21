const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const allDocs = await prisma.documents.findMany({
    orderBy: { id: 'desc' },
    take: 20,
  });

  console.log(`\n📊 Checking ${allDocs.length} documents...\n`);
  
  let validCount = 0;
  let invalidCount = 0;
  
  for (const doc of allDocs) {
    // Try to find file
    const possiblePaths = [
      path.resolve(process.cwd(), 'backend', doc.file_path.replace(/^\//, '')),
      path.resolve(process.cwd(), doc.file_path.replace(/^\//, '')),
      path.resolve(process.cwd(), 'backend', 'storage', path.basename(doc.file_path)),
    ];
    
    let found = false;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        console.log(`✅ Doc ${doc.id}: ${doc.file_path} -> ${p}`);
        validCount++;
        found = true;
        break;
      }
    }
    
    if (!found) {
      console.log(`❌ Doc ${doc.id}: ${doc.file_path} (NOT FOUND)`);
      invalidCount++;
    }
  }
  
  console.log(`\n📈 Summary: ${validCount} valid, ${invalidCount} invalid\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
