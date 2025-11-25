/**
 * Script: Create test document with approval workflow
 * 
 * Creates:
 * 1. Test PDF document
 * 2. Assigns to creator@acme.local
 * 3. Submits for approval workflow
 * 4. Creates approval for approver@acme.local
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function createTestDocumentWithApproval() {
  try {
    console.log('🔧 Creating test document with approval workflow...\n');

    // Get tenant
    const tenant = await prisma.tenants.findFirst({
      where: { 
        name: { contains: 'ACME', mode: 'insensitive' }
      }
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Get creator user
    const creator = await prisma.users.findUnique({
      where: { email: 'creator@acme.local' }
    });

    if (!creator) {
      throw new Error('Creator user not found. Run create-approval-test-users.js first');
    }

    // Get approver user
    const approver = await prisma.users.findUnique({
      where: { email: 'approver@acme.local' }
    });

    if (!approver) {
      throw new Error('Approver user not found. Run create-approval-test-users.js first');
    }

    // Get document type that requires approval
    const docType = await prisma.document_types.findFirst({
      where: {
        tenant_id: tenant.id,
        require_approval: true
      }
    });

    if (!docType) {
      throw new Error('No document type with approval requirement found');
    }

    // Get workflow
    const workflow = await prisma.workflows.findFirst({
      where: {
        tenant_id: tenant.id,
        is_active: true
      },
      include: {
        steps: {
          orderBy: { step_order: 'asc' }
        }
      }
    });

    if (!workflow || workflow.steps.length === 0) {
      throw new Error('No active workflow with steps found');
    }

    console.log(`📋 Using workflow: ${workflow.name} (${workflow.steps.length} steps)`);

    // Create test PDF file
    const storageDir = path.join(__dirname, '../../storage/documents');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const fileName = `test-approval-${Date.now()}.pdf`;
    const filePath = path.join(storageDir, fileName);
    
    // Create a simple PDF (minimal valid PDF)
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test Document for Approval) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000317 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
410
%%EOF`;

    fs.writeFileSync(filePath, pdfContent);
    console.log(`✅ Created test PDF: ${fileName}\n`);

    // Create document
    console.log('📝 Creating document...');
    const document = await prisma.documents.create({
      data: {
        tenant_id: tenant.id,
        owner_id: creator.id,
        document_type_id: docType.id,
        file_path: `storage/documents/${fileName}`,
        original_file_name: fileName,
        title: 'Tài liệu test phê duyệt',
        status: 'draft',
        confidential_level: 'normal',
        visibility_scope: 'public'
      }
    });

    console.log(`✅ Document created: ID ${document.id}`);
    console.log(`   Title: ${document.title}`);
    console.log(`   Owner: ${creator.full_name} (${creator.email})\n`);

    // Create workflow instance
    console.log('🔄 Creating workflow instance...');
    const workflowInstance = await prisma.workflow_instances.create({
      data: {
        document_id: document.id,
        workflow_id: workflow.id,
        current_step_id: workflow.steps[0].id,
        status: 'in_progress'
      }
    });

    console.log(`✅ Workflow instance created: ID ${workflowInstance.id}\n`);

    // Create approval for first step
    const firstStep = workflow.steps[0];
    console.log(`📋 Creating approval for step: ${firstStep.step_name}`);
    
    const approval = await prisma.document_approvals.create({
      data: {
        document_id: document.id,
        workflow_id: workflow.id,
        workflow_step_id: firstStep.id,
        approver_user_id: approver.id,
        action: 'pending',
        due_date: new Date(Date.now() + firstStep.due_in_days * 24 * 60 * 60 * 1000)
      }
    });

    console.log(`✅ Approval created: ID ${approval.id}`);
    console.log(`   Approver: ${approver.full_name} (${approver.email})`);
    console.log(`   Due date: ${approval.due_date?.toLocaleDateString('vi-VN')}\n`);

    // Update document status
    await prisma.documents.update({
      where: { id: document.id },
      data: { status: 'pending_approval' }
    });

    console.log('🎉 SUCCESS! Test document with approval created!\n');
    console.log('📋 Summary:');
    console.log(`   Document ID: ${document.id}`);
    console.log(`   Title: ${document.title}`);
    console.log(`   Status: pending_approval`);
    console.log(`   Workflow: ${workflow.name}`);
    console.log(`   Current Step: ${firstStep.step_name}`);
    console.log(`   Approver: ${approver.email}`);
    console.log(`   Approval ID: ${approval.id}\n`);

    console.log('🧪 Test Instructions:');
    console.log('1. Login as approver@acme.local / password123');
    console.log('2. Go to "Phê duyệt của tôi" (My Approvals)');
    console.log(`3. Find approval ID ${approval.id}`);
    console.log('4. Click "Xử lý" (Process)');
    console.log('5. Choose action: Approve / Reject / Request Info');
    console.log('6. Add signature (optional) and comments');
    console.log('7. Submit\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestDocumentWithApproval();
