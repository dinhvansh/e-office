const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedWorkflows() {
  try {
    console.log('🔄 Seeding workflows...\n');

    // Get tenant
    const tenant = await prisma.tenants.findFirst();
    if (!tenant) {
      console.log('❌ No tenant found! Run main seed first.');
      return;
    }
    console.log('✅ Using tenant:', tenant.name);

    // The demo workflow must use the same normalized assignment model as the
    // workflow editor. Legacy approver_type-only rows cannot show a resolved
    // actor in the current UI and can create unusable approval tasks.
    const [manager, legal, admin] = await Promise.all([
      prisma.users.findFirst({ where: { tenant_id: tenant.id, email: 'manager@acme.local' } }),
      prisma.users.findFirst({ where: { tenant_id: tenant.id, email: 'legal@acme.local' } }),
      prisma.users.findFirst({ where: { tenant_id: tenant.id, email: 'admin@acme.local' } }),
    ]);

    if (!manager || !legal || !admin) {
      throw new Error('Demo approvers are missing. Run seed-demo-internal-users.js before seeding workflows.');
    }

    const approverStep = (workflowId, stepOrder, stepName, userId) => ({
      workflow_id: workflowId,
      step_order: stepOrder,
      step_name: stepName,
      approver_type: 'user',
      approver_id: userId,
      assignee_type: 'specific_user',
      assignee_user_id: userId,
      completion_mode: 'all',
      participant_role: 'approver',
    });

    console.log('\n📋 Creating workflows...');

    // Workflow 1: Simple Approval (1 step)
    const workflow1 = await prisma.workflows.upsert({
      where: { 
        tenant_id_name: { 
          tenant_id: tenant.id, 
          name: 'Phê duyệt đơn giản' 
        } 
      },
      update: {},
      create: {
        tenant_id: tenant.id,
        name: 'Phê duyệt đơn giản',
        description: 'Quy trình 1 bước - Quản lý trực tiếp phê duyệt',
        is_active: true,
      },
    });
    console.log('✅ Created:', workflow1.name);

    // Add step for workflow 1
    await prisma.workflow_steps.deleteMany({
      where: { workflow_id: workflow1.id }
    });
    await prisma.workflow_steps.create({
      data: approverStep(workflow1.id, 1, 'Phê duyệt quản lý', manager.id),
    });
    console.log('  → Added 1 step');

    // Workflow 2: Two-Level Approval
    const workflow2 = await prisma.workflows.upsert({
      where: { 
        tenant_id_name: { 
          tenant_id: tenant.id, 
          name: 'Phê duyệt 2 cấp' 
        } 
      },
      update: {},
      create: {
        tenant_id: tenant.id,
        name: 'Phê duyệt 2 cấp',
        description: 'Quy trình 2 bước - Quản lý phòng ban → Giám đốc',
        is_active: true,
      },
    });
    console.log('✅ Created:', workflow2.name);

    // Add steps for workflow 2
    await prisma.workflow_steps.deleteMany({
      where: { workflow_id: workflow2.id }
    });
    await prisma.workflow_steps.createMany({
      data: [
        approverStep(workflow2.id, 1, 'Phê duyệt trưởng phòng', manager.id),
        approverStep(workflow2.id, 2, 'Phê duyệt giám đốc', admin.id),
      ],
    });
    console.log('  → Added 2 steps');

    // Workflow 3: Contract Approval (3 steps)
    const workflow3 = await prisma.workflows.upsert({
      where: { 
        tenant_id_name: { 
          tenant_id: tenant.id, 
          name: 'Phê duyệt hợp đồng' 
        } 
      },
      update: {},
      create: {
        tenant_id: tenant.id,
        name: 'Phê duyệt hợp đồng',
        description: 'Quy trình 3 bước - Phòng ban → Quản lý → Giám đốc',
        is_active: true,
      },
    });
    console.log('✅ Created:', workflow3.name);

    // Add steps for workflow 3
    await prisma.workflow_steps.deleteMany({
      where: { workflow_id: workflow3.id }
    });
    await prisma.workflow_steps.createMany({
      data: [
        approverStep(workflow3.id, 1, 'Phê duyệt phòng ban', manager.id),
        approverStep(workflow3.id, 2, 'Phê duyệt pháp chế', legal.id),
        approverStep(workflow3.id, 3, 'Phê duyệt giám đốc', admin.id),
      ],
    });
    console.log('  → Added 3 steps');

    // Keep the documented Hợp đồng type aligned with the verified three-step
    // contract approval workflow, rather than a stale workflow id from a
    // previous demo run.
    await prisma.document_types.updateMany({
      where: { tenant_id: tenant.id, code: 'HOP_DONG' },
      data: { default_workflow_id: workflow3.id, require_approval: true },
    });
    console.log('  → Mapped Hợp đồng to the 3-step contract workflow');

    console.log('\n✅ Workflows seeded successfully!');
    console.log('\n📊 Summary:');
    console.log('  - 3 workflows created');
    console.log('  - 6 workflow steps created');
    console.log('  - Ready to test at /workflows page');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

seedWorkflows();
