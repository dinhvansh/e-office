const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedWorkflowApprovalFull() {
  try {
    console.log('🔄 Seeding comprehensive workflow & approval test data...\n');

    // Get tenant
    const tenant = await prisma.tenants.findFirst();
    if (!tenant) {
      console.log('❌ No tenant found!');
      return;
    }
    console.log('✅ Using tenant:', tenant.name);

    // Get users
    const adminUser = await prisma.users.findFirst({
      where: { email: 'admin@acme.local' }
    });
    
    const allUsers = await prisma.users.findMany({
      where: { tenant_id: tenant.id },
      take: 5
    });

    if (!adminUser || allUsers.length === 0) {
      console.log('❌ Users not found!');
      return;
    }
    console.log(`✅ Found ${allUsers.length} users`);

    // Get roles
    const adminRole = await prisma.roles.findFirst({
      where: { tenant_id: tenant.id, name: 'Admin' }
    });
    const managerRole = await prisma.roles.findFirst({
      where: { tenant_id: tenant.id, name: 'Manager' }
    });
    const userRole = await prisma.roles.findFirst({
      where: { tenant_id: tenant.id, name: 'User' }
    });

    if (!adminRole || !managerRole || !userRole) {
      console.log('❌ Roles not found!');
      return;
    }
    console.log('✅ Found roles: Admin, Manager, User');

    // Get departments
    const departments = await prisma.departments.findMany({
      where: { tenant_id: tenant.id },
      take: 3
    });

    if (departments.length === 0) {
      console.log('❌ Departments not found!');
      return;
    }
    console.log(`✅ Found ${departments.length} departments`);

    // Get document types
    const docTypes = await prisma.document_types.findMany({
      where: { tenant_id: tenant.id },
      take: 5
    });

    if (docTypes.length === 0) {
      console.log('❌ Document types not found!');
      return;
    }
    console.log(`✅ Found ${docTypes.length} document types`);

    console.log('\n📋 Creating workflows...');

    // ========================================
    // WORKFLOW 1: Simple Approval (1 step)
    // ========================================
    const workflow1 = await prisma.workflows.create({
      data: {
        tenant_id: tenant.id,
        name: 'Phê duyệt đơn giản',
        description: 'Quy trình phê duyệt 1 cấp - Chỉ cần quản lý trực tiếp duyệt',
        is_active: true,
      },
    });

    await prisma.workflow_steps.create({
      data: {
        workflow_id: workflow1.id,
        step_name: 'Phê duyệt quản lý',
        step_order: 1,
        approver_type: 'manager',
        approver_id: null,
        is_required: true,
      },
    });

    console.log('  ✅ Created: Phê duyệt đơn giản (1 step)');

    // ========================================
    // WORKFLOW 2: Two-Level Approval (2 steps)
    // ========================================
    const workflow2 = await prisma.workflows.create({
      data: {
        tenant_id: tenant.id,
        name: 'Phê duyệt 2 cấp',
        description: 'Quy trình phê duyệt 2 cấp - Trưởng phòng → Giám đốc',
        is_active: true,
      },
    });

    await prisma.workflow_steps.createMany({
      data: [
        {
          workflow_id: workflow2.id,
          step_name: 'Phê duyệt trưởng phòng',
          step_order: 1,
          approver_type: 'manager',
          approver_id: null,
          is_required: true,
        },
        {
          workflow_id: workflow2.id,
          step_name: 'Phê duyệt giám đốc',
          step_order: 2,
          approver_type: 'role',
          approver_id: adminRole.id,
          is_required: true,
        },
      ],
    });

    console.log('  ✅ Created: Phê duyệt 2 cấp (2 steps)');

    // ========================================
    // WORKFLOW 3: Contract Approval (3 steps)
    // ========================================
    const workflow3 = await prisma.workflows.create({
      data: {
        tenant_id: tenant.id,
        name: 'Phê duyệt hợp đồng',
        description: 'Quy trình phê duyệt hợp đồng - Phòng ban → Quản lý → Giám đốc',
        is_active: true,
      },
    });

    await prisma.workflow_steps.createMany({
      data: [
        {
          workflow_id: workflow3.id,
          step_name: 'Phê duyệt phòng ban',
          step_order: 1,
          approver_type: 'department',
          approver_id: departments[0].id,
          is_required: true,
        },
        {
          workflow_id: workflow3.id,
          step_name: 'Phê duyệt quản lý',
          step_order: 2,
          approver_type: 'role',
          approver_id: managerRole.id,
          is_required: true,
        },
        {
          workflow_id: workflow3.id,
          step_name: 'Phê duyệt giám đốc',
          step_order: 3,
          approver_type: 'role',
          approver_id: adminRole.id,
          is_required: true,
        },
      ],
    });

    console.log('  ✅ Created: Phê duyệt hợp đồng (3 steps)');

    // ========================================
    // WORKFLOW 4: Department Approval (2 steps)
    // ========================================
    const workflow4 = await prisma.workflows.create({
      data: {
        tenant_id: tenant.id,
        name: 'Phê duyệt nội bộ phòng ban',
        description: 'Quy trình phê duyệt nội bộ - Phòng IT → Phòng Hành chính',
        is_active: true,
      },
    });

    await prisma.workflow_steps.createMany({
      data: [
        {
          workflow_id: workflow4.id,
          step_name: 'Phê duyệt phòng IT',
          step_order: 1,
          approver_type: 'department',
          approver_id: departments[0].id,
          is_required: true,
        },
        {
          workflow_id: workflow4.id,
          step_name: 'Phê duyệt phòng Hành chính',
          step_order: 2,
          approver_type: 'department',
          approver_id: departments[1]?.id || departments[0].id,
          is_required: true,
        },
      ],
    });

    console.log('  ✅ Created: Phê duyệt nội bộ phòng ban (2 steps)');

    // ========================================
    // WORKFLOW 5: User-Specific Approval (2 steps)
    // ========================================
    const workflow5 = await prisma.workflows.create({
      data: {
        tenant_id: tenant.id,
        name: 'Phê duyệt người dùng cụ thể',
        description: 'Quy trình phê duyệt với người dùng được chỉ định',
        is_active: true,
      },
    });

    await prisma.workflow_steps.createMany({
      data: [
        {
          workflow_id: workflow5.id,
          step_name: 'Phê duyệt người dùng 1',
          step_order: 1,
          approver_type: 'user',
          approver_id: allUsers[0].id,
          is_required: true,
        },
        {
          workflow_id: workflow5.id,
          step_name: 'Phê duyệt người dùng 2',
          step_order: 2,
          approver_type: 'user',
          approver_id: allUsers[1]?.id || allUsers[0].id,
          is_required: true,
        },
      ],
    });

    console.log('  ✅ Created: Phê duyệt người dùng cụ thể (2 steps)');

    // ========================================
    // CREATE TEST DOCUMENTS & APPROVALS
    // ========================================
    console.log('\n📄 Creating test documents & approvals...');

    const documentScenarios = [
      {
        title: 'Đơn xin nghỉ phép - Nguyễn Văn A',
        workflow: workflow1,
        docType: docTypes[0],
        status: 'pending',
        approvalStatus: 'pending',
        comments: null,
      },
      {
        title: 'Đề xuất mua thiết bị văn phòng',
        workflow: workflow2,
        docType: docTypes[1],
        status: 'pending',
        approvalStatus: 'pending',
        comments: null,
      },
      {
        title: 'Hợp đồng thuê văn phòng 2025',
        workflow: workflow3,
        docType: docTypes[2],
        status: 'approved',
        approvalStatus: 'approved',
        comments: 'Đã phê duyệt - Hợp đồng hợp lệ',
      },
      {
        title: 'Báo cáo tài chính Q4/2024',
        workflow: workflow2,
        docType: docTypes[3],
        status: 'rejected',
        approvalStatus: 'rejected',
        comments: 'Từ chối - Thiếu chữ ký kế toán trưởng',
      },
      {
        title: 'Đề xuất nâng cấp hệ thống',
        workflow: workflow4,
        docType: docTypes[4],
        status: 'pending_approval',
        approvalStatus: 'info_requested',
        comments: 'Cần bổ sung chi phí dự kiến',
      },
      {
        title: 'Hợp đồng lao động - Trần Thị B',
        workflow: workflow3,
        docType: docTypes[0],
        status: 'pending',
        approvalStatus: 'pending',
        comments: null,
      },
      {
        title: 'Đơn đề nghị tăng lương',
        workflow: workflow2,
        docType: docTypes[1],
        status: 'approved',
        approvalStatus: 'approved',
        comments: 'Đã phê duyệt - Tăng 15%',
      },
      {
        title: 'Kế hoạch marketing 2025',
        workflow: workflow5,
        docType: docTypes[2],
        status: 'pending',
        approvalStatus: 'pending',
        comments: null,
      },
    ];

    let createdCount = 0;
    let approvalCount = 0;

    for (const scenario of documentScenarios) {
      // Create document
      const doc = await prisma.documents.create({
        data: {
          tenant_id: tenant.id,
          title: scenario.title,
          file_name: `${scenario.title.toLowerCase().replace(/\s+/g, '-')}.pdf`,
          file_path: `/uploads/${Date.now()}.pdf`,
          file_size: Math.floor(Math.random() * 2000000) + 100000, // 100KB - 2MB
          mime_type: 'application/pdf',
          document_type_id: scenario.docType.id,
          created_by: adminUser.id,
          status: scenario.status,
        },
      });

      createdCount++;

      // Get first step
      const firstStep = await prisma.workflow_steps.findFirst({
        where: { 
          workflow_id: scenario.workflow.id,
          step_order: 1 
        },
      });

      if (firstStep) {
        // Create workflow instance
        const workflowInstance = await prisma.workflow_instances.create({
          data: {
            workflow_id: scenario.workflow.id,
            document_id: doc.id,
            current_step_id: firstStep.id,
            status: scenario.status === 'approved' ? 'completed' : 
                    scenario.status === 'rejected' ? 'rejected' : 'in_progress',
          },
        });

        // Create approval
        await prisma.document_approvals.create({
          data: {
            document_id: doc.id,
            workflow_id: scenario.workflow.id,
            workflow_step_id: firstStep.id,
            approver_user_id: adminUser.id,
            action: scenario.approvalStatus,
            comment: scenario.comments,
            acted_at: scenario.approvalStatus !== 'pending' ? new Date() : null,
          },
        });

        approvalCount++;
      }

      console.log(`  ✅ Created: ${scenario.title} (${scenario.approvalStatus})`);
    }

    console.log('\n✅ Seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - ${5} workflows created`);
    console.log(`  - ${11} workflow steps created`);
    console.log(`  - ${createdCount} test documents created`);
    console.log(`  - ${approvalCount} document approvals created`);
    console.log('\n📈 Approval Status Breakdown:');
    console.log(`  - Pending: ${documentScenarios.filter(s => s.approvalStatus === 'pending').length}`);
    console.log(`  - Approved: ${documentScenarios.filter(s => s.approvalStatus === 'approved').length}`);
    console.log(`  - Rejected: ${documentScenarios.filter(s => s.approvalStatus === 'rejected').length}`);
    console.log(`  - Info Requested: ${documentScenarios.filter(s => s.approvalStatus === 'info_requested').length}`);
    console.log('\n🎯 Ready to test at:');
    console.log('  - /workflows - Workflow management');
    console.log('  - /approvals - My pending approvals');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

seedWorkflowApprovalFull();
