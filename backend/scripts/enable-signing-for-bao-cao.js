/**
 * Enable digital signing for Báo cáo document type
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Enabling digital signing for Báo cáo...\n');

  const result = await prisma.document_types.updateMany({
    where: { code: 'BAO_CAO' },
    data: { require_digital_signing: true },
  });

  console.log(`✅ Updated ${result.count} document type(s)\n`);

  // Show current status
  const docType = await prisma.document_types.findFirst({
    where: { code: 'BAO_CAO' },
  });

  if (docType) {
    console.log('📋 Báo cáo settings:');
    console.log(`   - require_approval: ${docType.require_approval}`);
    console.log(`   - require_digital_signing: ${docType.require_digital_signing}`);
    console.log(`   - default_workflow_id: ${docType.default_workflow_id}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
