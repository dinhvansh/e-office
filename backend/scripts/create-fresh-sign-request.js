const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function createFreshSignRequest() {
  try {
    console.log('🔍 Creating Fresh Sign Request for Testing...\n');

    // Create document
    console.log('1. Creating document...');
    const document = await prisma.documents.create({
      data: {
        tenant_id: 1,
        owner_id: 1,
        document_type_id: 8, // Báo cáo
        file_path: 'storage/1/test-fresh.pdf',
        original_file_name: 'test-fresh.pdf',
        file_size: 1024,
        status: 'draft',
        title: 'Test Fresh Document',
        require_digital_signing: true
      }
    });
    console.log('✅ Document created:', document.id);
    console.log('');

    // Create sign request
    console.log('2. Creating sign request...');
    const signRequest = await prisma.sign_requests.create({
      data: {
        tenant_id: 1,
        document_id: document.id,
        title: 'Test Fresh Sign Request',
        status: 'draft',
        workflow_type: 'sequential'
      }
    });
    console.log('✅ Sign request created:', signRequest.id);
    console.log('');

    // Update document with sign_request_id
    await prisma.documents.update({
      where: { id: document.id },
      data: { sign_request_id: signRequest.id }
    });

    // Create signers
    console.log('3. Creating signers...');
    const signer1 = await prisma.signers.create({
      data: {
        tenant_id: 1,
        sign_request_id: signRequest.id,
        email: 'admin@acme.local',
        name: 'Admin User',
        signing_order: 1,
        is_internal: true,
        user_id: 1,
        status: 'pending'
      }
    });
    console.log('✅ Signer 1 created:', signer1.email);

    const signer2 = await prisma.signers.create({
      data: {
        tenant_id: 1,
        sign_request_id: signRequest.id,
        email: 'approver@acme.local',
        name: 'Approver User',
        signing_order: 2,
        is_internal: true,
        user_id: 17,
        status: 'pending'
      }
    });
    console.log('✅ Signer 2 created:', signer2.email);
    console.log('');

    console.log('📊 Summary:');
    console.log('  Document ID:', document.id);
    console.log('  Sign Request ID:', signRequest.id);
    console.log('  Status:', signRequest.status);
    console.log('  Signers:', 2);
    console.log('');

    console.log('🎯 Next Steps:');
    console.log('  1. Go to: http://localhost:3000/sign-requests/' + signRequest.id + '/editor');
    console.log('  2. Add signature fields (click on PDF)');
    console.log('  3. Click "Gửi đi ký"');
    console.log('  4. Should work now!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

createFreshSignRequest();
