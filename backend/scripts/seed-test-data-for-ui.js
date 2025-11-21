/**
 * Seed Test Data for Workflow UI Testing
 * 
 * Creates:
 * - 4 document types (one for each workflow mode)
 * - 2 workflows (for strict and flexible modes)
 * - Sample users for testing
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding test data for workflow UI...\n');

  // Get tenant
  const tenant = await prisma.tenants.findFirst();
  if (!tenant) {
    throw new Error('No tenant found. Run seed.js first.');
  }

  console.log(`✅ Using tenant: ${tenant.name} (ID: ${tenant.id})\n`);

  // Get admin user
  const adminUser = await prisma.users.findFirst({
    where: { email: 'admin@acme.local' },
  });

  if (!adminUser) {
    throw new Error('Admin user not found. Run seed.js first.');
  }

  console.log(`✅ Using admin user: ${adminUser.email} (ID: ${adminUser.id})\n`);

  // ============================================
  // 1. Create Workflows (if not exist)
  // ============================================
  console.log('📋 Creating workflows...\n');

  let simpleWorkflow = await prisma.workflows.findFirst({
    where: {
      tenant_id: tenant.id,
      name: 'Simple Approval',
      is_template: true,
    },
  });

  if (!simpleWorkflow) {
    simpleWorkflow = await prisma.workflows.create({
      data: {
        tenant_id: tenant.id,
        name: 'Simple Approval',
        description: '1-step approval workflow',
        is_template: true,
        created_by: adminUser.id,
        is_active: true,
      },
    });

    await prisma.workflow_steps.create({
      data: {
        workflow_id: simpleWorkflow.id,
        step_order: 1,
        step_name: 'Manager Approval',
        approver_type: 'user',
        approver_id: adminUser.id,
        due_in_days: 3,
        is_required: true,
      },
    });

    console.log(`✅ Created workflow: ${simpleWorkflow.name} (ID: ${simpleWorkflow.id})`);
  } else {
    console.log(`✅ Workflow exists: ${simpleWorkflow.name} (ID: ${simpleWorkflow.id})`);
  }

  let twoStepWorkflow = await prisma.workflows.findFirst({
    where: {
      tenant_id: tenant.id,
      name: '2-Level Approval',
      is_template: true,
    },
  });

  if (!twoStepWorkflow) {
    twoStepWorkflow = await prisma.workflows.create({
      data: {
        tenant_id: tenant.id,
        name: '2-Level Approval',
        description: '2-step approval workflow',
        is_template: true,
        created_by: adminUser.id,
        is_active: true,
      },
    });

    await prisma.workflow_steps.createMany({
      data: [
        {
          workflow_id: twoStepWorkflow.id,
          step_order: 1,
          step_name: 'Department Manager',
          approver_type: 'user',
          approver_id: adminUser.id,
          due_in_days: 3,
          is_required: true,
        },
        {
          workflow_id: twoStepWorkflow.id,
          step_order: 2,
          step_name: 'Director',
          approver_type: 'user',
          approver_id: adminUser.id,
          due_in_days: 5,
          is_required: true,
        },
      ],
    });

    console.log(`✅ Created workflow: ${twoStepWorkflow.name} (ID: ${twoStepWorkflow.id})`);
  } else {
    console.log(`✅ Workflow exists: ${twoStepWorkflow.name} (ID: ${twoStepWorkflow.id})`);
  }

  console.log('');

  // ============================================
  // 2. Create Document Types for 4 Modes
  // ============================================
  console.log('📄 Creating document types for 4 workflow modes...\n');

  // Mode 1: No Approval
  const mode1 = await prisma.document_types.upsert({
    where: {
      tenant_id_code: {
        tenant_id: tenant.id,
        code: 'TEST_MODE1',
      },
    },
    update: {
      require_approval: false,
      default_workflow_id: null,
      allow_workflow_override: false,
    },
    create: {
      tenant_id: tenant.id,
      code: 'TEST_MODE1',
      name: '[TEST] Tài liệu tham khảo',
      description: 'Chế độ 1: Không cần phê duyệt',
      category: 'internal',
      require_numbering: true,
      require_digital_signing: false,
      require_approval: false,
      default_workflow_id: null,
      allow_workflow_override: false,
      is_active: true,
    },
  });

  console.log(`✅ Mode 1 (No Approval): ${mode1.name} (ID: ${mode1.id})`);

  // Create numbering rule for Mode 1
  await prisma.numbering_rules.upsert({
    where: {
      tenant_id_document_type_id: {
        tenant_id: tenant.id,
        document_type_id: mode1.id,
      },
    },
    update: {},
    create: {
      tenant_id: tenant.id,
      document_type_id: mode1.id,
      pattern: '{AUTO}/{YEAR}',
      reset_yearly: true,
      last_number: 0,
    },
  });

  // Mode 2: Strict Workflow
  const mode2 = await prisma.document_types.upsert({
    where: {
      tenant_id_code: {
        tenant_id: tenant.id,
        code: 'TEST_MODE2',
      },
    },
    update: {
      require_approval: true,
      default_workflow_id: simpleWorkflow.id,
      allow_workflow_override: false,
    },
    create: {
      tenant_id: tenant.id,
      code: 'TEST_MODE2',
      name: '[TEST] Hợp đồng',
      description: 'Chế độ 2: Strict - Bắt buộc dùng workflow mặc định',
      category: 'contract',
      require_numbering: true,
      require_digital_signing: false,
      require_approval: true,
      default_workflow_id: simpleWorkflow.id,
      allow_workflow_override: false,
      is_active: true,
    },
  });

  console.log(`✅ Mode 2 (Strict): ${mode2.name} (ID: ${mode2.id})`);

  // Create numbering rule for Mode 2
  await prisma.numbering_rules.upsert({
    where: {
      tenant_id_document_type_id: {
        tenant_id: tenant.id,
        document_type_id: mode2.id,
      },
    },
    update: {},
    create: {
      tenant_id: tenant.id,
      document_type_id: mode2.id,
      pattern: 'HD-{AUTO}/{YEAR}',
      reset_yearly: true,
      last_number: 0,
    },
  });

  // Mode 3: Flexible Workflow
  const mode3 = await prisma.document_types.upsert({
    where: {
      tenant_id_code: {
        tenant_id: tenant.id,
        code: 'TEST_MODE3',
      },
    },
    update: {
      require_approval: true,
      default_workflow_id: twoStepWorkflow.id,
      allow_workflow_override: true,
    },
    create: {
      tenant_id: tenant.id,
      code: 'TEST_MODE3',
      name: '[TEST] Công văn',
      description: 'Chế độ 3: Flexible - Có thể tùy chỉnh workflow',
      category: 'outgoing',
      require_numbering: true,
      require_digital_signing: false,
      require_approval: true,
      default_workflow_id: twoStepWorkflow.id,
      allow_workflow_override: true,
      is_active: true,
    },
  });

  console.log(`✅ Mode 3 (Flexible): ${mode3.name} (ID: ${mode3.id})`);

  // Create numbering rule for Mode 3
  await prisma.numbering_rules.upsert({
    where: {
      tenant_id_document_type_id: {
        tenant_id: tenant.id,
        document_type_id: mode3.id,
      },
    },
    update: {},
    create: {
      tenant_id: tenant.id,
      document_type_id: mode3.id,
      pattern: 'CV-{AUTO}/{YEAR}',
      reset_yearly: true,
      last_number: 0,
    },
  });

  // Mode 4: Ad-hoc Workflow
  const mode4 = await prisma.document_types.upsert({
    where: {
      tenant_id_code: {
        tenant_id: tenant.id,
        code: 'TEST_MODE4',
      },
    },
    update: {
      require_approval: true,
      default_workflow_id: null,
      allow_workflow_override: false,
    },
    create: {
      tenant_id: tenant.id,
      code: 'TEST_MODE4',
      name: '[TEST] Đề xuất',
      description: 'Chế độ 4: Ad-hoc - User tự tạo workflow',
      category: 'internal',
      require_numbering: true,
      require_digital_signing: false,
      require_approval: true,
      default_workflow_id: null,
      allow_workflow_override: false,
      is_active: true,
    },
  });

  console.log(`✅ Mode 4 (Ad-hoc): ${mode4.name} (ID: ${mode4.id})`);

  // Create numbering rule for Mode 4
  await prisma.numbering_rules.upsert({
    where: {
      tenant_id_document_type_id: {
        tenant_id: tenant.id,
        document_type_id: mode4.id,
      },
    },
    update: {},
    create: {
      tenant_id: tenant.id,
      document_type_id: mode4.id,
      pattern: 'DX-{AUTO}/{YEAR}',
      reset_yearly: true,
      last_number: 0,
    },
  });

  console.log('');

  // ============================================
  // Summary
  // ============================================
  console.log('✅ Test data seeded successfully!\n');
  console.log('📊 Summary:');
  console.log(`   - Workflows: 2 (Simple, 2-Level)`);
  console.log(`   - Document Types: 4 (one for each mode)`);
  console.log('');
  console.log('🧪 Test on UI:');
  console.log('   1. Go to Document Types page');
  console.log('   2. See 4 test document types with [TEST] prefix');
  console.log('   3. Go to Documents page');
  console.log('   4. Upload documents with each type to test workflow modes');
  console.log('');
  console.log('📝 Document Types Created:');
  console.log(`   - ${mode1.name} (Mode 1: No Approval)`);
  console.log(`   - ${mode2.name} (Mode 2: Strict)`);
  console.log(`   - ${mode3.name} (Mode 3: Flexible)`);
  console.log(`   - ${mode4.name} (Mode 4: Ad-hoc)`);
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
