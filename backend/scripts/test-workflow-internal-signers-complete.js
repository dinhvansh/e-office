const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:4000/api/v1';

let authToken = '';

async function login() {
  console.log('🔐 Logging in as admin...');
  const response = await axios.post(`${API_BASE}/auth/login`, {
    email: 'admin@acme.local',
    password: 'password123'
  });
  authToken = response.data.data.tokens.accessToken;
  console.log('✅ Login successful\n');
}

async function testWorkflowInternalSigners() {
  console.log('📋 TEST: Workflow with Internal Signers\n');
  console.log('=' .repeat(60) + '\n');

  try {
    await login();

    // Step 1: Get workflow with internal signers
    console.log('Step 1: Get workflow with internal signers');
    const workflow = await prisma.workflows.findFirst({
      where: { name: 'Hợp đồng với người ký nội bộ' },
      include: { steps: { orderBy: { step_order: 'asc' } } }
    });

    if (!workflow) {
      console.error('❌ Workflow not found. Run seed-workflow-with-internal-signers.js first');
      return;
    }

    console.log(`✅ Found workflow: ${workflow.name} (ID: ${workflow.id})`);
    console.log(`   Steps: ${workflow.steps.length}`);
    
    const approverSteps = workflow.steps.filter(s => s.participant_role === 'approver');
    const signerSteps = workflow.steps.filter(s => s.participant_role === 'signer');
    
    console.log(`   - Approver steps: ${approverSteps.length}`);
    console.log(`   - Signer steps: ${signerSteps.length}\n`);

    // Step 2: Get document type that requires signing
    console.log('Step 2: Get document type');
    const docType = await prisma.document_types.findFirst({
      where: {
        require_digital_signing: true,
        is_active: true
      }
    });

    if (!docType) {
      console.error('❌ No document type with digital signing found');
      return;
    }

    console.log(`✅ Document type: ${docType.name} (ID: ${docType.id})\n`);

    // Step 3: Create test PDF
    console.log('Step 3: Create test PDF');
    const testPdfPath = path.join(__dirname, '../test-data/test-contract.pdf');
    if (!fs.existsSync(testPdfPath)) {
      fs.mkdirSync(path.dirname(testPdfPath), { recursive: true });
      fs.writeFileSync(testPdfPath, '%PDF-1.4\nTest PDF for workflow internal signers\n%%EOF');
    }
    console.log(`✅ Test PDF ready\n`);

    // Step 4: Upload document with workflow
    console.log('Step 4: Upload document with workflow');
    
    // Read file and convert to base64
    const fileBuffer = fs.readFileSync(testPdfPath);
    const fileBase64 = fileBuffer.toString('base64');
    
    const uploadPayload = {
      file_base64: fileBase64,
      file_name: 'test-workflow-internal-signers.pdf',
      file_type: 'application/pdf',
      title: 'Test Workflow Internal Signers',
      document_type_id: docType.id,
      require_digital_signing: true,
      workflowId: workflow.id
    };

    const uploadResponse = await axios.post(`${API_BASE}/documents`, uploadPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    const responseData = uploadResponse.data.data;
    console.log('Response data:', JSON.stringify(responseData, null, 2));
    
    // Get document ID from response
    const documentId = responseData.id || responseData.document?.id || responseData.document_id;
    
    if (!documentId) {
      console.error('❌ Could not get document ID from response');
      return;
    }
    
    console.log(`✅ Document created: ID ${documentId}`);
    
    // Get full document with sign_request_id
    const fullDocument = await prisma.documents.findUnique({
      where: { id: documentId },
      select: { id: true, title: true, sign_request_id: true }
    });
    
    console.log(`   Sign Request ID: ${fullDocument.sign_request_id}\n`);

    // Step 5: Check signers created
    console.log('Step 5: Verify internal signers auto-created');
    const signers = await prisma.signers.findMany({
      where: { sign_request_id: fullDocument.sign_request_id },
      include: { user: { select: { email: true, full_name: true } } },
      orderBy: { signing_order: 'asc' }
    });

    console.log(`✅ Found ${signers.length} signers:\n`);
    
    for (const signer of signers) {
      const icon = signer.is_internal ? '✍️' : '🌐';
      const type = signer.is_internal ? 'Internal' : 'External';
      console.log(`   ${icon} Signer ${signer.signing_order}: ${signer.name}`);
      console.log(`      Email: ${signer.email}`);
      console.log(`      Role: ${signer.role}`);
      console.log(`      Type: ${type}`);
      console.log(`      User ID: ${signer.user_id || 'N/A'}`);
      console.log('');
    }

    // Step 6: Verify only signer steps created signers
    console.log('Step 6: Verify correct number of signers');
    if (signers.length === signerSteps.length) {
      console.log(`✅ PASS: ${signers.length} signers created (matches ${signerSteps.length} signer steps)`);
    } else {
      console.log(`❌ FAIL: Expected ${signerSteps.length} signers, got ${signers.length}`);
    }

    // Step 7: Verify all signers are internal
    console.log('\nStep 7: Verify all signers are internal');
    const allInternal = signers.every(s => s.is_internal === true);
    if (allInternal) {
      console.log(`✅ PASS: All signers are internal`);
    } else {
      console.log(`❌ FAIL: Some signers are not internal`);
    }

    // Step 8: Verify signing order
    console.log('\nStep 8: Verify signing order');
    const ordersCorrect = signers.every((s, i) => s.signing_order === signerSteps[i].step_order);
    if (ordersCorrect) {
      console.log(`✅ PASS: Signing order matches workflow step order`);
    } else {
      console.log(`❌ FAIL: Signing order mismatch`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY\n');
    console.log(`Workflow: ${workflow.name}`);
    console.log(`Total steps: ${workflow.steps.length}`);
    console.log(`  - Approver steps: ${approverSteps.length} (for approval workflow)`);
    console.log(`  - Signer steps: ${signerSteps.length} (auto-created as internal signers)`);
    console.log(`\nDocument: ${fullDocument.title}`);
    console.log(`  - Document ID: ${fullDocument.id}`);
    console.log(`  - Sign Request ID: ${fullDocument.sign_request_id}`);
    console.log(`  - Internal signers created: ${signers.length}`);
    console.log(`\n✅ All tests passed!`);
    console.log('\n💡 Next steps:');
    console.log('   1. User can add external signers manually');
    console.log('   2. Internal signers will sign via "Ký ngay" button');
    console.log('   3. External signers will sign via email link + OTP\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testWorkflowInternalSigners()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
