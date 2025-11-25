/**
 * Setup complete test data for internal-to-external flow
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setup() {
  console.log('🔧 Setting up test data for internal-to-external flow...\n');
  
  // 1. Create document with sign request
  console.log('📄 Creating document...');
  const document = await prisma.documents.create({
    data: {
      tenant_id: 1,
      title: 'Test Contract - Internal to External Flow',
      document_type_id: 1,
      file_path: 'storage/1/test-contract.pdf',
      original_file_name: 'test-contract.pdf',
      status: 'draft',
      owner_id: 1,
      sign_requests: {
        create: {
          tenant_id: 1,
          workflow_type: 'sequential',
          status: 'draft'
        }
      }
    },
    include: {
      sign_requests: true
    }
  });
  
  const signRequestId = document.sign_requests[0].id;
  
  // Update document with sign_request_id
  await prisma.documents.update({
    where: { id: document.id },
    data: { sign_request_id: signRequestId }
  });
  
  console.log(`✅ Document created: ID ${document.id}`);
  console.log(`✅ Sign Request created: ID ${signRequestId}`);
  
  // 2. Add internal approver (signing order 1)
  console.log('\n👨‍💼 Adding internal approver...');
  const internalSigner = await prisma.signers.create({
    data: {
      sign_request_id: signRequestId,
      email: 'approver@acme.local',
      name: 'Internal Approver',
      signing_order: 1,
      is_internal: true,
      status: 'pending'
    }
  });
  console.log(`✅ Internal signer added: ${internalSigner.email} (Order: 1)`);
  
  // 3. Add external signer (signing order 2)
  console.log('\n👤 Adding external signer...');
  const externalSigner = await prisma.signers.create({
    data: {
      sign_request_id: signRequestId,
      email: 'external.signer@example.com',
      name: 'External Signer',
      signing_order: 2,
      is_internal: false,
      status: 'pending'
    }
  });
  console.log(`✅ External signer added: ${externalSigner.email} (Order: 2)`);
  
  // 4. Add signature fields
  console.log('\n📝 Adding signature fields...');
  const field1 = await prisma.sign_request_fields.create({
    data: {
      sign_request_id: signRequestId,
      document_id: document.id,
      assigned_signer_id: internalSigner.id,
      type: 'signature',
      page: 1,
      x: 20,
      y: 20,
      width: 150,
      height: 50,
      required: true
    }
  });
  
  const field2 = await prisma.sign_request_fields.create({
    data: {
      sign_request_id: signRequestId,
      document_id: document.id,
      assigned_signer_id: externalSigner.id,
      type: 'signature',
      page: 1,
      x: 20,
      y: 80,
      width: 150,
      height: 50,
      required: true
    }
  });
  console.log(`✅ Added 2 signature fields`);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ SETUP COMPLETE!');
  console.log('='.repeat(60));
  console.log(`📄 Document ID: ${document.id}`);
  console.log(`📋 Sign Request ID: ${signRequestId}`);
  console.log(`👨‍💼 Internal Signer: ${internalSigner.email} (ID: ${internalSigner.id})`);
  console.log(`👤 External Signer: ${externalSigner.email} (ID: ${externalSigner.id})`);
  console.log(`📝 Fields: ${field1.id}, ${field2.id}`);
  console.log('='.repeat(60));
  
  return {
    documentId: document.id,
    signRequestId,
    internalSignerId: internalSigner.id,
    externalSignerId: externalSigner.id
  };
}

setup()
  .then(() => {
    console.log('\n✅ Ready to run test-internal-to-external-flow.js');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
