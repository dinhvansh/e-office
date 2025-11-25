const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Changing HỢP ĐỒNG to strict mode...\n');

  const result = await prisma.document_types.update({
    where: { code: 'HOP_DONG' },
    data: {
      allow_workflow_override: false // Strict mode - cannot customize
    }
  });

  console.log('✅ Updated successfully!');
  console.log('   - allow_workflow_override:', result.allow_workflow_override);
  console.log('   - Mode: strict (WorkflowPreview will render)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
