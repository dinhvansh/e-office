const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestApprovals() {
  console.log('📝 Creating test documents with approvals for admin\n');

  try {
    // Get admin user
    const admin = await prisma.users.findFirst({
      where: { email: 'admin@acme.local' }
    });

    if (!admin) {
      throw new Error('Admin user not found');
    }

    console.log('✅ Found admin user:', admin.email, '(ID:', admin.id, ')');

    // Get a workflow
    const workflow = await prisma.workflows.findFirst({
      where: { tenant_id: admin.tenant_id },
      include: {
        steps: {
          orderBy: { step_order: 'asc' }
        }
      }
    });

    if (!workflow) {
      throw new Error('No workflow found');
    }

    console.log('✅ Found workflow:', workflow.name, '(ID:', workflow.id, ')');
    console.log('   Steps:', workflow.steps.length);

    // Get document type
    const docType = await prisma.document_types.findFirst({
      where: { tenant_id: admin.tenant_id }
    });

    console.log('✅ Found document type:', docType?.name, '\n');

    // Create 5 test documents with approvals
    const documents = [];
    const titles = [
      'Đơn xin nghỉ phép - Test 1',
      'Đề xuất mua thiết bị - Test 2',
      'Hợp đồng lao động - Test 3',
      'Kế hoạch dự án - Test 4',
      'Báo cáo tháng - Test 5'
    ];

    for (let i = 0; i < 5; i++) {
      console.log(`${i + 1}. Creating document: ${titles[i]}`);

      // Create document
      const doc = await prisma.documents.create({
        data: {
          tenant_id: admin.tenant_id,
          title: titles[i],
          original_file_name: `test-document-${i + 1}.pdf`,
          file_path: `uploads/tenant-${admin.tenant_id}/test-${Date.now()}-${i}.pdf`,
          document_type_id: docType?.id,
          owner_id: admin.id,
          status: 'pending_approval',
          visibility_scope: 'public',
          confidential_level: 'normal'
        }
      });

      console.log('   ✓ Document created (ID:', doc.id, ')');

      // Create workflow instance
      const instance = await prisma.workflow_instances.create({
        data: {
          document_id: doc.id,
          workflow_id: workflow.id,
          current_step_id: workflow.steps[0].id,
          status: 'in_progress',
          started_at: new Date()
        }
      });

      console.log('   ✓ Workflow instance created (ID:', instance.id, ')');

      // Create approval for first step
      const approval = await prisma.document_approvals.create({
        data: {
          document_id: doc.id,
          workflow_id: workflow.id,
          workflow_step_id: workflow.steps[0].id,
          approver_user_id: admin.id,
          action: 'pending',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        }
      });

      console.log('   ✓ Approval created (ID:', approval.id, ')');
      console.log('   ✓ Assigned to:', admin.email);
      console.log('   ✓ Due date:', approval.due_date.toISOString().split('T')[0]);
      console.log('');

      documents.push({
        document: doc,
        instance,
        approval
      });
    }

    console.log('✅ Created', documents.length, 'test documents with approvals\n');

    // Summary
    console.log('📊 Summary:');
    console.log('   Documents created:', documents.length);
    console.log('   All assigned to:', admin.email);
    console.log('   Status: pending_approval');
    console.log('   Workflow:', workflow.name);
    console.log('\n🎉 Done! You can now login as admin@acme.local to see these approvals.');

    await prisma.$disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createTestApprovals();
