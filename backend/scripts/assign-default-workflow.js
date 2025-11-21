/**
 * Assign default workflow to all document types that require approval
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Assigning default workflow to document types...\n');

  // Get first workflow (Simple Approval)
  const workflow = await prisma.workflows.findFirst({
    where: { is_active: true },
    orderBy: { id: 'asc' },
  });

  if (!workflow) {
    console.log('❌ No workflow found! Please create a workflow first.');
    return;
  }

  console.log(`✅ Using workflow: ${workflow.name} (ID: ${workflow.id})\n`);

  // Get all document types that require approval but don't have workflow
  const documentTypes = await prisma.document_types.findMany({
    where: {
      require_approval: true,
      default_workflow_id: null,
    },
  });

  console.log(`📋 Found ${documentTypes.length} document types without workflow:\n`);

  for (const docType of documentTypes) {
    console.log(`   - ${docType.name} (${docType.code})`);
    
    await prisma.document_types.update({
      where: { id: docType.id },
      data: { default_workflow_id: workflow.id },
    });
  }

  console.log(`\n✅ Updated ${documentTypes.length} document types!`);
  console.log('\n📝 Summary:');
  
  const updated = await prisma.document_types.findMany({
    where: {
      require_approval: true,
    },
    include: {
      default_workflow: {
        select: { name: true },
      },
    },
  });

  for (const docType of updated) {
    const workflowName = docType.default_workflow?.name || '(none)';
    console.log(`   ${docType.name}: ${workflowName}`);
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
