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

    // Get roles
    const managerRole = await prisma.roles.findFirst({
      where: { name: 'Manager', tenant_id: tenant.id }
    });
    const adminRole = await prisma.roles.findFirst({
      where: { name: 'Admin', tenant_id: tenant.id }
    });

    // Get departments
    const itDept = await prisma.departments.findFirst({
      where: { name: 'IT Department', tenant_id: tenant.id }
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
      data: {
        workflow_id: workflow1.id,
        step_order: 1,
        step_name: 'Phê duyệt quản lý',
        approver_type: 'manager',
      },
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
        {
          workflow_id: workflow2.id,
          step_order: 1,
          step_name: 'Phê duyệt trưởng phòng',
          approver_type: 'manager',
          approver_id: null,
        },
        {
          workflow_id: workflow2.id,
          step_order: 2,
          step_name: 'Phê duyệt giám đốc',
          approver_type: 'role',
          approver_id: adminRole?.id,
        },
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
        {
          workflow_id: workflow3.id,
          step_order: 1,
          step_name: 'Phê duyệt phòng ban',
          approver_type: 'department',
          approver_id: itDept?.id,
        },
        {
          workflow_id: workflow3.id,
          step_order: 2,
          step_name: 'Phê duyệt quản lý',
          approver_type: 'role',
          approver_id: managerRole?.id,
        },
        {
          workflow_id: workflow3.id,
          step_order: 3,
          step_name: 'Phê duyệt giám đốc',
          approver_type: 'role',
          approver_id: adminRole?.id,
        },
      ],
    });
    console.log('  → Added 3 steps');

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
