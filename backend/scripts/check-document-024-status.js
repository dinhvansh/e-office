const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDocument024() {
  try {
    console.log('🔍 Checking document 024/2025...\n');
    
    // Find document by number
    const doc = await prisma.documents.findFirst({
      where: {
        document_number: '024/2025'
      },
      include: {
        document_type: true,
        owner: {
          select: {
            full_name: true,
            email: true
          }
        },
        sign_request: true,
        workflow_instance: true
      }
    });
    
    if (!doc) {
      console.log('❌ Document 024/2025 not found');
      return;
    }
    
    console.log('📄 Document Details:');
    console.log(`   ID: ${doc.id}`);
    console.log(`   Number: ${doc.document_number}`);
    console.log(`   Title: ${doc.title || doc.original_file_name || 'No title'}`);
    console.log(`   Status: ${doc.status}`);
    console.log(`   Type: ${doc.document_type?.name || 'N/A'}`);
    console.log(`   Owner: ${doc.owner?.full_name || 'N/A'}`);
    console.log(`   Created: ${doc.created_at}`);
    console.log(`   Sign Request ID: ${doc.sign_request_id || 'None'}`);
    console.log(`   Workflow Instance ID: ${doc.workflow_instance_id || 'None'}`);
    
    console.log('\n💡 Delete Rules:');
    console.log(`   - Can delete if status = 'draft': ${doc.status === 'draft' ? '✅ YES' : '❌ NO'}`);
    console.log(`   - Current status: ${doc.status}`);
    
    if (doc.status !== 'draft') {
      console.log('\n⚠️  This document CANNOT be deleted because:');
      console.log(`   Status is '${doc.status}', not 'draft'`);
      console.log('\n   To make it deletable, change status to "draft":');
      console.log(`   UPDATE documents SET status = 'draft' WHERE id = ${doc.id};`);
    } else {
      console.log('\n✅ This document CAN be deleted (status is draft)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocument024();
