const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setDocumentCompleted() {
  try {
    console.log('🔍 Finding documents to set as completed...\n');
    
    // Find a document that is NOT completed
    const documents = await prisma.documents.findMany({
      where: {
        status: {
          notIn: ['completed', 'archived', 'cancelled']
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 5,
      include: {
        document_type: true,
        owner: {
          select: {
            full_name: true,
            email: true
          }
        }
      }
    });
    
    if (documents.length === 0) {
      console.log('❌ No documents found to update');
      return;
    }
    
    console.log(`Found ${documents.length} documents:\n`);
    documents.forEach((doc, index) => {
      console.log(`${index + 1}. ID: ${doc.id}`);
      console.log(`   Title: ${doc.title || doc.original_file_name || 'No title'}`);
      console.log(`   Status: ${doc.status}`);
      console.log(`   Type: ${doc.document_type?.name || 'N/A'}`);
      console.log(`   Owner: ${doc.owner?.full_name || 'N/A'}`);
      console.log('');
    });
    
    // Update the first document to completed
    const docToUpdate = documents[0];
    
    console.log(`\n📝 Updating document #${docToUpdate.id} to 'completed'...\n`);
    
    const updated = await prisma.documents.update({
      where: { id: docToUpdate.id },
      data: { 
        status: 'completed'
      }
    });
    
    console.log('✅ Document updated successfully!');
    console.log(`   ID: ${updated.id}`);
    console.log(`   New Status: ${updated.status}`);
    console.log(`   Updated At: ${updated.updated_at}`);
    
    console.log('\n💡 You can now test archive/cancel with this document:');
    console.log(`   - Go to http://localhost:3000/documents`);
    console.log(`   - Switch to "📦 Quản lý lưu trữ" tab`);
    console.log(`   - Find document #${updated.id}`);
    console.log(`   - Click "Thanh lý" or "Hủy" button\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  setDocumentCompleted();
}

module.exports = { setDocumentCompleted };
