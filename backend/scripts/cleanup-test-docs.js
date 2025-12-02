/**
 * Cleanup Test Documents
 * 
 * Xóa các documents test có prefix [TEST]
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning up test documents...\n');

  const result = await prisma.documents.deleteMany({
    where: {
      title: {
        startsWith: '[TEST]'
      }
    }
  });

  console.log(`✅ Deleted ${result.count} test documents\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
