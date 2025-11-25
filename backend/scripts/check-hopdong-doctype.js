const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking HỢP ĐỒNG document type...\n');

  const docType = await prisma.document_types.findFirst({
    where: {
      code: 'HOP_DONG'
    }
  });

  if (!docType) {
    console.log('❌ HỢP ĐỒNG document type not found');
    return;
  }

  console.log('✅ Document Type Found:');
  console.log('   - ID:', docType.id);
  console.log('   - Code:', docType.code);
  console.log('   - Name:', docType.name);
  console.log('   - require_approval:', docType.require_approval);
  console.log('   - default_workflow_id:', docType.default_workflow_id);
  console.log('   - allow_workflow_override:', docType.allow_workflow_override);

  if (docType.default_workflow_id) {
    console.log('\n✅ Has default workflow ID:', docType.default_workflow_id);
    
    const workflow = await prisma.workflows.findUnique({
      where: { id: docType.default_workflow_id },
      include: {
        steps: {
          orderBy: { step_order: 'asc' }
        }
      }
    });

    if (workflow) {
      console.log('✅ Workflow found:', workflow.name);
      console.log('   - Steps:', workflow.steps.length);
      workflow.steps.forEach((step, i) => {
        console.log(`   - Step ${i + 1}:`, step.step_name, '(', step.approver_type, ')');
      });
    }
  } else {
    console.log('\n❌ No default_workflow_id set!');
    console.log('   This is why WorkflowPreview is not rendering.');
  }

  // Check workflow mode logic
  console.log('\n📋 Workflow Mode Logic:');
  if (!docType.require_approval) {
    console.log('   Mode: no_approval (no workflow needed)');
  } else if (docType.default_workflow_id && !docType.allow_workflow_override) {
    console.log('   Mode: strict (must use default workflow)');
    console.log('   ✅ WorkflowPreview SHOULD render');
  } else if (docType.default_workflow_id && docType.allow_workflow_override) {
    console.log('   Mode: flexible (can customize workflow)');
  } else {
    console.log('   Mode: adhoc (create workflow from scratch)');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
