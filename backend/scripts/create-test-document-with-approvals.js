const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function createTestDocument() {
  try {
    console.log('🧪 Creating Test Document with Approvals...\n');

    // Find admin user
    const admin = await prisma.users.findFirst({
      where: { email: 'admin@acme.local' }
    });

    if (!admin) {
      console.log('❌ Admin user not found');
      return;
    }

    // Find a workflow with approvers
    const workflow = await prisma.workflows.findFirst({
      where: {
        tenant_id: 1,
        is_active: true
      },
      include: {
        steps: {
          where: {
            participant_role: 'approver'
          },
          include: {
            approver: true
          }
        }
      }
    });

    if (!workflow || workflow.steps.length === 0) {
      console.log('❌ No workflow with approvers found');
      return;
    }

    console.log('✅ Found workflow:', workflow.name);
    console.log('   Approvers:', workflow.steps.length);
    console.log('\n');

    // Create document
    const document = await prisma.documents.create({
      data: {
        tenant_id: 1,
        owner_id: admin.id,
        title: 'Test Document for Internal Signing',
        original_file_name: 'test-document.pdf',
        file_path: 'storage/1/test-document.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        document_number: 'TEST-' + Date.now(),
        status: 'pending',
        visibility_scope: 'department',
        department_id: admin.department_id
      }
    });

    console.log('✅ Created document:', document.id);
    console.log('   Title:', document.title);
    console.log('   Number:', document.document_number);
    console.log('\n');

    // Create approvals
    for (const step of workflow.steps) {
      const approval = await prisma.approvals.create({
        data: {
          document_id: document.id,
          approver_id: step.approver_id,
          tenant_id: 1,
          status: 'approved',
          comments: `Đã phê duyệt bởi ${step.approver.full_name}. Tài liệu đạt yêu cầu và được chấp thuận.`,
          approved_at: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000) // Random time in last 24h
        }
      });

      console.log(`✅ Created approval ${approval.id}:`);
      console.log(`   Approver: ${step.approver.full_name}`);
      console.log(`   Status: ${approval.status}`);
      console.log(`   Comments: ${approval.comments}`);
      console.log('\n');
    }

    // Create sign request
    const signRequest = await prisma.sign_requests.create({
      data: {
        document_id: document.id,
        tenant_id: 1,
        title: 'Sign Request for ' + document.title,
        message: 'Vui lòng ký tài liệu này',
        status: 'pending',
        workflow_type: 'sequential'
      }
    });

    console.log('✅ Created sign request:', signRequest.id);
    console.log('\n');

    // Create internal signers
    const users = await prisma.users.findMany({
      where: {
        tenant_id: 1,
        id: { not: admin.id }
      },
      take: 2
    });

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const signer = await prisma.signers.create({
        data: {
          sign_request_id: signRequest.id,
          user_id: user.id,
          name: user.full_name,
          email: user.email,
          role: 'signer',
          status: i === 0 ? 'pending' : 'pending',
          signing_order: i + 1,
          is_internal: true
        }
      });

      console.log(`✅ Created signer ${signer.id}:`);
      console.log(`   Name: ${signer.name}`);
      console.log(`   Email: ${signer.email}`);
      console.log(`   Order: ${signer.signing_order}`);
      console.log('\n');
    }

    console.log('✅ Test document created successfully!');
    console.log('\n');
    console.log('🎯 Test Internal Signing URL:');
    console.log(`   http://localhost:3000/sign-requests/${signRequest.id}/sign`);
    console.log('\n');
    console.log('📝 This page should show:');
    console.log('   ✅ PDF viewer with document');
    console.log('   ✅ Document information');
    console.log(`   ✅ Approval history (${workflow.steps.length} approvals with comments)`);
    console.log('   ✅ Signature canvas');
    console.log('   ✅ Submit button');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestDocument();
