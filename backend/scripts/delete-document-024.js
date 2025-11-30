const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteDocument024() {
  try {
    console.log('🔍 Finding document 024/2025...\n');
    
    const doc = await prisma.documents.findFirst({
      where: {
        document_number: '024/2025'
      }
    });
    
    if (!doc) {
      console.log('❌ Document 024/2025 not found');
      return;
    }
    
    console.log(`Found document #${doc.id}: ${doc.title || doc.original_file_name}`);
    console.log(`Status: ${doc.status}\n`);
    
    if (doc.status !== 'draft') {
      console.log('⚠️  Warning: Document is not in draft status');
      console.log('   Deleting anyway...\n');
    }
    
    // Delete the document
    await prisma.documents.delete({
      where: { id: doc.id }
    });
    
    console.log('✅ Document 024/2025 deleted successfully!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'P2003') {
      console.log('\n⚠️  Cannot delete: Document has related records (foreign key constraint)');
      console.log('   You may need to delete related records first:');
      console.log('   - Approvals');
      console.log('   - Sign requests');
      console.log('   - Workflow instances');
      console.log('   - Audit logs');
    }
  } finally {
    await prisma.$disconnect();
  }
}

deleteDocument024();
