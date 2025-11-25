const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestDocument() {
  console.log('📄 Creating test document...');
  
  // Create document with sign request
  const document = await prisma.documents.create({
    data: {
      tenant_id: 1,
      title: 'Test Contract - Internal to External',
      document_type_id: 1, // Công văn đến
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
  
  console.log('✅ Document created');
  console.log(`   ID: ${document.id}`);
  console.log(`   Sign Request ID: ${document.sign_requests?.id || 'N/A'}`);
  
  return document;
}

createTestDocument()
  .then(() => {
    console.log('\n✅ Done');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
