const axios = require('axios');

const API_BASE = 'http://localhost:4000/api/v1';

async function testUploadWithWorkflowApproval() {
  console.log('🧪 Testing Upload with Workflow → Approval Creation\n');

  try {
    // Login
    console.log('1️⃣ Login...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@acme.local',
      password: 'password123'
    });
    
    const token = loginRes.data.data.tokens.accessToken;
    const userId = loginRes.data.data.user.id;
    console.log('✅ Login successful\n');

    // Get document type with workflow
    console.log('2️⃣ Get document types...');
    const docTypesRes = await axios.get(`${API_BASE}/document-types`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const docTypes = docTypesRes.data.data;
    const hopDong = docTypes.find(dt => dt.name === 'Hợp đồng');
    
    console.log('✅ Found Hợp đồng');
    console.log(`   Workflow ID: ${hopDong.default_workflow_id}`);
    console.log(`   Require approval: ${hopDong.require_approval}`);
    console.log(`   Require signing: ${hopDong.require_digital_signing}\n`);

    // Create dummy PDF
    const dummyPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n190\n%%EOF');
    const base64Pdf = dummyPdf.toString('base64');

    // Upload document
    console.log('3️⃣ Upload document with workflow...');
    const uploadRes = await axios.post(`${API_BASE}/documents`, {
      file_name: 'test-workflow-approval.pdf',
      file_base64: base64Pdf,
      document_type_id: hopDong.id,
      workflow_id: hopDong.default_workflow_id,
      title: 'Test Document - Workflow Approval',
      confidential_level: 'normal',
      visibility_scope: 'public'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const document = uploadRes.data.data.document;
    console.log('✅ Document uploaded');
    console.log(`   ID: ${document.id}`);
    console.log(`   Status: ${document.status}`);
    console.log(`   Sign Request ID: ${document.sign_request_id}\n`);

    // Check workflow instance
    console.log('4️⃣ Check workflow instance...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const instance = await prisma.workflow_instances.findFirst({
      where: { document_id: document.id },
      include: {
        workflow: { select: { name: true } },
        current_step: { select: { step_name: true } }
      }
    });
    
    if (instance) {
      console.log('✅ Workflow instance created');
      console.log(`   ID: ${instance.id}`);
      console.log(`   Workflow: ${instance.workflow?.name}`);
      console.log(`   Current Step: ${instance.current_step?.step_name}`);
      console.log(`   Status: ${instance.status}\n`);
    } else {
      console.log('❌ No workflow instance found\n');
    }

    // Check approvals
    console.log('5️⃣ Check approvals...');
    const approvals = await prisma.document_approvals.findMany({
      where: { document_id: document.id },
      include: {
        approver: { select: { email: true, full_name: true } },
        workflow_step: { select: { step_name: true } }
      }
    });
    
    console.log(`✅ Found ${approvals.length} approval(s)`);
    
    if (approvals.length > 0) {
      approvals.forEach((approval, idx) => {
        console.log(`\n${idx + 1}. Approval ID: ${approval.id}`);
        console.log(`   Approver: ${approval.approver?.email}`);
        console.log(`   Step: ${approval.workflow_step?.step_name}`);
        console.log(`   Action: ${approval.action}`);
        console.log(`   Due: ${approval.due_date?.toISOString().split('T')[0]}`);
      });
    }

    // Check if approval appears in "my pending"
    console.log('\n\n6️⃣ Check "My Pending Approvals" API...');
    const myApprovalsRes = await axios.get(`${API_BASE}/approvals/my-pending`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const myApprovals = myApprovalsRes.data.data;
    const thisApproval = myApprovals.find(a => a.document_id === document.id);
    
    if (thisApproval) {
      console.log('✅ Approval appears in "My Pending"!');
      console.log(`   Document: ${thisApproval.document?.title}`);
      console.log(`   Workflow: ${thisApproval.workflow?.name}`);
    } else {
      console.log('❌ Approval NOT in "My Pending"');
      console.log(`   Total pending: ${myApprovals.length}`);
    }

    await prisma.$disconnect();
    console.log('\n✅ Test completed!');

  } catch (error) {
    console.error('\n❌ Test failed!');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Error:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

testUploadWithWorkflowApproval();
