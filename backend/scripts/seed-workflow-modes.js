/**
 * Seed Document Types with Workflow Settings
 * 
 * Setup 4 modes:
 * 1. Mode 1: Công văn đến (ID: 1) - No approval
 * 2. Mode 2: Hợp đồng (ID: 3) - Strict workflow
 * 3. Mode 3: Công văn đi (ID: 2) - Flexible workflow
 * 4. Mode 4: Đề xuất (ID: 7) - Ad-hoc workflow
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding workflow modes...\n');

  // Get tenant
  const tenant = await prisma.tenants.findFirst();
  if (!tenant) {
    throw new Error('No tenant found');
  }

  // Get workflows
  const workflows = await prisma.workflows.findMany({
    where: { tenant_id: tenant.id, is_template: true },
  });

  if (workflows.length === 0) {
    console.log('⚠️  No workflows found. Creating sample workflows...\n');
    
    // Create simple workflow
    const simpleWorkflow = await prisma.workflows.create({
      data: {
        tenant_id: tenant.id,
        name: 'Simple Approval',
        description: '1-step approval',
        is_template: true,
        created_by: 1,
        is_active: true,
      },
    });

    await prisma.workflow_steps.create({
      data: {
        workflow_id: simpleWorkflow.id,
        step_order: 1,
        step_name: 'Manager Approval',
        approver_type: 'user',
        approver_id: 1,
        due_in_days: 3,
        is_required: true,
      },
    });

    console.log(`✅ Created workflow: ${simpleWorkflow.name} (ID: ${simpleWorkflow.id})`);
    workflows.push(simpleWorkflow);
  }

  const defaultWorkflow = workflows[0];

  // Mode 1: No Approval (Công văn đến)
  await prisma.document_types.update({
    where: { id: 1 },
    data: {
      require_approval: false,
      default_workflow_id: null,
      allow_workflow_override: false,
    },
  });
  console.log('✅ Mode 1: Công văn đến (No Approval)');

  // Mode 2: Strict Workflow (Hợp đồng)
  await prisma.document_types.update({
    where: { id: 3 },
    data: {
      require_approval: true,
      default_workflow_id: defaultWorkflow.id,
      allow_workflow_override: false,
    },
  });
  console.log(`✅ Mode 2: Hợp đồng (Strict - Workflow ${defaultWorkflow.id})`);

  // Mode 3: Flexible Workflow (Công văn đi)
  await prisma.document_types.update({
    where: { id: 2 },
    data: {
      require_approval: true,
      default_workflow_id: defaultWorkflow.id,
      allow_workflow_override: true,
    },
  });
  console.log(`✅ Mode 3: Công văn đi (Flexible - Workflow ${defaultWorkflow.id})`);

  // Mode 4: Ad-hoc Workflow (Đề xuất)
  await prisma.document_types.update({
    where: { id: 7 },
    data: {
      require_approval: true,
      default_workflow_id: null,
      allow_workflow_override: false,
    },
  });
  console.log('✅ Mode 4: Đề xuất (Ad-hoc)');

  console.log('\n✅ Workflow modes seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
