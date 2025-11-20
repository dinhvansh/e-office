const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedMoreApprovals() {
  try {
    console.log('🔄 Creating more test approvals...\n');

    // Get tenant
    const tenant = await prisma.tenants.findFirst();
    if (!tenant) {
      console.log('❌ No tenant found!');
      return;
    }

    // Get admin user
    const adminUser = await prisma.users.findFirst({
      where: { email: 'admin@acme.local' }
    });
    if (!adminUser) {
      console.log('❌ Admin user not found!');
      return;
    }

    // Get existing workflows
    const workflows = await prisma.workflows.findMany({
      where: { tenant_id: tenant.id },
      include: { steps: true }
    });

    if (workflows.length === 0) {
      console.log('❌ No workflows found! Run seed-workflows-simple.js first.');
      return;
    }

    console.log(`✅ Found ${workflows.length} workflows`);

    // Get document types
    const docTypes = await prisma.document_types.findMany({
      where: { tenant_id: tenant.id },
      take: 5
    });

    if (docTypes.length === 0) {
      console.log('❌ No document types found!');
      return;
    }

    console.log(`✅ Found ${docTypes.length} document types`);
    console.log('\n📄 Creating test documents & approvals...');

    const scenarios = [
      {
        title: 'Đơn xin nghỉ phép - Nguyễn Văn A',
        workflowIndex: 0,
        docTypeIndex: 0,
        status: 'pending_approval',
        approvalAction: 'pending',
        comment: null,
      },
      {
        title: 'Đề xuất mua thiết bị văn phòng',
        workflowIndex: 1,
        docTypeIndex: 1,
        status: 'pending_approval',
        approvalAction: 'pending',
        comment: null,
      },
      {
        title: 'Hợp đồng thuê văn phòng 2025',
        workflowIndex: 2,
        docTypeIndex: 2,
        status: 'approved',
        approvalAction: 'approved',
        comment: 'Đã phê duyệt - Hợp đồng hợp lệ',
      },
      {
        title: 'Báo cáo tài chính Q4/2024',
        workflowIndex: 1,
        docTypeIndex: 0,
        status: 'rejected',
        approvalAction: 'rejected',
        comment: 'Từ chối - Thiếu chữ ký kế toán trưởng',
      },
      {
        title: 'Đề xuất nâng cấp hệ thống',
        workflowIndex: 0,
        docTypeIndex: 1,
        status: 'pending_approval',
        approvalAction: 'request_info',
        comment: 'Cần bổ sung chi phí dự kiến',
      },
      {
        title: 'Hợp đồng lao động - Trần Thị B',
        workflowIndex: 2,
        docTypeIndex: 2,
        status: 'pending_approval',
        approvalAction: 'pending',
        comment: null,
      },
      {
        title: 'Đơn đề nghị tăng lương',
        workflowIndex: 1,
        docTypeIndex: 0,
        status: 'approved',
        approvalAction: 'approved',
        comment: 'Đã phê duyệt - Tăng 15%',
      },
      {
        title: 'Kế hoạch marketing 2025',
        workflowIndex: 0,
        docTypeIndex: 1,
        status: 'pending_approval',
        approvalAction: 'pending',
        comment: null,
      },
      {
        title: 'Đề xuất đào tạo nhân viên',
        workflowIndex: 1,
        docTypeIndex: 2,
        status: 'pending_approval',
        approvalAction: 'pending',
        comment: null,
      },
      {
        title: 'Báo cáo dự án Q1/2025',
        workflowIndex: 2,
        docTypeIndex: 0,
        status: 'approved',
        approvalAction: 'approved',
        comment: 'Đã phê duyệt - Dự án hoàn thành tốt',
      },
    ];

    let createdCount = 0;
    let approvalCount = 0;

    for (const scenario of scenarios) {
      const workflow = workflows[scenario.workflowIndex % workflows.length];
      const docType = docTypes[scenario.docTypeIndex % docTypes.length];

      if (!workflow || !docType) continue;

      // Create document
      const doc = await prisma.documents.create({
        data: {
          tenant_id: tenant.id,
          title: scenario.title,
          file_path: `/uploads/${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`,
          document_type_id: docType.id,
          owner_id: adminUser.id,
          status: scenario.status,
        },
      });

      createdCount++;

      // Get first step
      const firstStep = workflow.steps.find(s => s.step_order === 1);
      if (!firstStep) continue;

      // Create workflow instance
      await prisma.workflow_instances.create({
        data: {
          workflow_id: workflow.id,
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
          workflow_id: workflow.id,
          workflow_step_id: firstStep.id,
          approver_user_id: adminUser.id,
          action: scenario.approvalAction,
          comment: scenario.comment,
          acted_at: scenario.approvalAction !== 'pending' ? new Date() : null,
        },
      });

      approvalCount++;
      console.log(`  ✅ Created: ${scenario.title} (${scenario.approvalAction})`);
    }

    console.log('\n✅ Seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - ${createdCount} test documents created`);
    console.log(`  - ${approvalCount} document approvals created`);
    console.log('\n📈 Approval Status Breakdown:');
    console.log(`  - Pending: ${scenarios.filter(s => s.approvalAction === 'pending').length}`);
    console.log(`  - Approved: ${scenarios.filter(s => s.approvalAction === 'approved').length}`);
    console.log(`  - Rejected: ${scenarios.filter(s => s.approvalAction === 'rejected').length}`);
    console.log(`  - Info Requested: ${scenarios.filter(s => s.approvalAction === 'request_info').length}`);
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

seedMoreApprovals();
