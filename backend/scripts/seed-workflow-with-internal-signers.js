const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding workflow with internal signers...\n');

  // Get tenant
  const tenant = await prisma.tenants.findFirst();
  if (!tenant) {
    console.error('❌ No tenant found');
    return;
  }
  console.log(`✅ Tenant: ${tenant.name} (ID: ${tenant.id})`);

  // Get users for internal signers
  const admin = await prisma.users.findFirst({
    where: { email: 'admin@acme.local' }
  });
  
  const approver = await prisma.users.findFirst({
    where: { email: 'approver@acme.local' }
  });

  if (!admin || !approver) {
    console.error('❌ Required users not found');
    return;
  }

  console.log(`✅ Admin: ${admin.email} (ID: ${admin.id})`);
  console.log(`✅ Approver: ${approver.email} (ID: ${approver.id})\n`);

  // Create or update workflow with mixed approvers + signers
  const workflowName = 'Hợp đồng với người ký nội bộ';
  
  let workflow = await prisma.workflows.findFirst({
    where: {
      tenant_id: tenant.id,
      name: workflowName
    }
  });

  if (workflow) {
    console.log(`📝 Updating existing workflow: ${workflowName} (ID: ${workflow.id})`);
    // Delete old steps
    await prisma.workflow_steps.deleteMany({
      where: { workflow_id: workflow.id }
    });
  } else {
    console.log(`📝 Creating new workflow: ${workflowName}`);
    workflow = await prisma.workflows.create({
      data: {
        tenant_id: tenant.id,
        name: workflowName,
        description: 'Workflow với người phê duyệt và người ký nội bộ',
        is_template: true,
        is_active: true
      }
    });
  }

  // Create workflow steps
  const steps = [
    {
      workflow_id: workflow.id,
      step_order: 1,
      step_name: 'Phê duyệt - Trưởng phòng',
      approver_type: 'user',
      approver_id: approver.id,
      participant_role: 'approver', // ✅ Người phê duyệt
      due_in_days: 3,
      is_required: true
    },
    {
      workflow_id: workflow.id,
      step_order: 2,
      step_name: 'Phê duyệt - Giám đốc',
      approver_type: 'user',
      approver_id: admin.id,
      participant_role: 'approver', // ✅ Người phê duyệt
      due_in_days: 3,
      is_required: true
    },
    {
      workflow_id: workflow.id,
      step_order: 3,
      step_name: 'Ký - Kế toán trưởng',
      approver_type: 'user',
      approver_id: approver.id,
      participant_role: 'signer', // ✅ Người ký nội bộ
      due_in_days: 5,
      is_required: true
    },
    {
      workflow_id: workflow.id,
      step_order: 4,
      step_name: 'Ký - Giám đốc',
      approver_type: 'user',
      approver_id: admin.id,
      participant_role: 'signer', // ✅ Người ký nội bộ
      due_in_days: 5,
      is_required: true
    }
  ];

  for (const step of steps) {
    await prisma.workflow_steps.create({ data: step });
    const roleIcon = step.participant_role === 'approver' ? '✅' : '✍️';
    console.log(`  ${roleIcon} Step ${step.step_order}: ${step.step_name} (${step.participant_role})`);
  }

  console.log(`\n✅ Workflow created with ${steps.length} steps`);
  console.log(`   - 2 approver steps (will create approvals)`);
  console.log(`   - 2 signer steps (will create internal signers)`);
  console.log(`\n📋 Workflow ID: ${workflow.id}`);
  console.log(`   Use this ID when creating documents\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
