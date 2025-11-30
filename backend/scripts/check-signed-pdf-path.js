const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.documents.findUnique({ where: { id: 74 } })
  .then(d => {
    console.log('Document 74 (022/2025):');
    console.log('  Status:', d.status);
    console.log('  Signed file path:', d.signed_file_path || '❌ NOT GENERATED');
    if (d.signed_file_path) {
      const fs = require('fs');
      const exists = fs.existsSync(d.signed_file_path);
      console.log('  File exists:', exists ? '✅ Yes' : '❌ No');
    }
  })
  .finally(() => prisma.$disconnect());
