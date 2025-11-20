const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedWorkflows() {
  try {
    console.log('🔄 Seeding workflows...\n');

    // Get tenant
    const tenant = await prisma.tenants.findFirst();
    if (!tenant) {
      console.log('❌ No tenant found. Please run seed.js first.');
      return;
    }

    console.log(`✅ Using tenant: ${tenant.name || 'Acme Corp'}\n`);

    // Get document types
    const documentTypes = await prisma.document_types.findMany({
      where: { tenant_id: tenant.id },
    });

    if (documentTypes.length === 0) {
      console.log('❌ No document types found. Please run seed-document-types.js first.');
      return;
    }

    // Get users for approvers
    const users = await prisma.users.findMany({
      where: { tenant_id: tenant.id },
      take: 3,
    });

    // Get departments
    const departments = await prisma.departments.findMany({
      where: { tenant_id: tenant.id },
      take: 2,
    });

    // Get roles
    const roles = await prisma.roles.findMany({
      where: { tenant_id: tenant.id },
      take: 2,
    });

    // Sample workflows
    const workflows = [
      {
        name: 'Phê duyệt đơn giản',
        description: 'Quy trình phê duyệt 1 bước - Trưởng phòng',
        document_type_id: documentTypes[0]?.id,
        steps: [
          {
            step_order: 1,
            step_name: 'Phê duyệt của Trưởng phòng',
            approver_type: 'role',
            approver_id: roles[0]?.id || 1,
            due_in_days: 3,
            is_required: true,
          },
        ],
      },
      {
        name: 'Phê duyệt 2 cấp',
        description: 'Quy trình phê duyệt 2 bước - Trưởng phòng → Giám đốc',
        document_type_id: documentTypes[1]?.id,
        steps: [
          {
            step_order: 1,
            step_name: 'Phê duyệt của Trưởng phòng',
            approver_type: 'role',
            approver_id: roles[0]?.id || 1,
            due_in_days: 2,
            is_required: true,
          },
          {
            step_order: 2,
            step_name: 'Phê duyệt của Giám đốc',
            approver_type: 'role',
            approver_id: roles[1]?.id || 2,
            due_in_days: 3,
            is_required: true,
          },
        ],
      },
      {
        name: 'Phê duyệt hợp đồng',
        description: 'Quy trình phê duyệt hợp đồng - Phòng ban → Pháp chế → Giám đốc',
        document_type_id: documentTypes.find(dt => dt.code === 'HOP_DONG')?.id,
        steps: [
          {
            step_order: 1,
            step_name: 'Phê duyệt của Phòng ban',
            approver_type: 'department',
            approver_id: departments[0]?.id || 1,
            due_in_days: 2,
            is_required: true,
          },
          {
            step_order: 2,
            step_name: 'Phê duyệt của Phòng Pháp chế',
            approver_type: 'department',
            approver_id: departments[1]?.id || 2,
            due_in_days: 3,
            is_required: true,
          },
          {
            step_order: 3,
            step_name: 'Phê duyệt của Giám đốc',
            approver_type: 'user',
            approver_id: users[0]?.id || 1,
            due_in_days: 5,
            is_required: true,
          },
        ],
      },
    ];

    // Create workflows
    for (const workflowData of workflows) {
      // Check if workflow already exists
      const existing = await prisma.workflows.findFirst({
        where: {
          tenant_id: tenant.id,
          name: workflowData.name,
        },
      });

      if (existing) {
        console.log(`⏭️  Workflow already exists: ${workflowData.name}`);
        continue;
      }

      // Create workflow with steps
      const workflow = await prisma.workflows.create({
        data: {
          tenant_id: tenant.id,
          name: workflowData.name,
          description: workflowData.description,
          document_type_id: workflowData.document_type_id,
          is_active: true,
          created_by: users[0]?.id,
          steps: {
            create: workflowData.steps,
          },
        },
        include: {
          steps: true,
        },
      });

      console.log(`✅ Created workflow: ${workflow.name}`);
      console.log(`   Steps: ${workflow.steps.length}`);
      workflow.steps.forEach((step) => {
        console.log(`   - Step ${step.step_order}: ${step.step_name} (${step.approver_type})`);
      });
      console.log('');
    }

    console.log('✅ Workflow seeding completed!\n');

    // Summary
    const totalWorkflows = await prisma.workflows.count({
      where: { tenant_id: tenant.id },
    });
    const totalSteps = await prisma.workflow_steps.count();

    console.log('📊 Summary:');
    console.log(`   Total workflows: ${totalWorkflows}`);
    console.log(`   Total steps: ${totalSteps}`);

  } catch (error) {
    console.error('❌ Error seeding workflows:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedWorkflows();
