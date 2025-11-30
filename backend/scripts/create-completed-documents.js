const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createCompletedDocuments() {
  try {
    console.log('🔍 Getting tenant and user info...\n');
    
    // Get first tenant and user
    const tenant = await prisma.tenants.findFirst();
    const user = await prisma.users.findFirst({
      where: { tenant_id: tenant.id }
    });
    const docType = await prisma.document_types.findFirst({
      where: { tenant_id: tenant.id }
    });
    
    if (!tenant || !user || !docType) {
      console.log('❌ Missing required data (tenant, user, or document type)');
      return;
    }
    
    console.log(`Tenant: ${tenant.name}`);
    console.log(`User: ${user.full_name || user.email}`);
    console.log(`Document Type: ${docType.name}\n`);
    
    // Create 3 completed documents
    const documents = [];
    for (let i = 1; i <= 3; i++) {
      const doc = await prisma.documents.create({
        data: {
          tenant_id: tenant.id,
          owner_id: user.id,
          document_type_id: docType.id,
          file_path: `/storage/${tenant.id}/test-completed-${i}.pdf`,
          original_file_name: `test-completed-${i}.pdf`,
          title: `Tài liệu test thanh lý ${i}`,
          status: 'completed',
          confidential_level: 'normal',
          visibility_scope: 'public',
          version: 1
        }
      });
      documents.push(doc);
      console.log(`✅ Created document #${doc.id}: ${doc.title}`);
    }
    
    console.log(`\n✅ Created ${documents.length} completed documents!`);
    console.log('\n💡 You can now test archive/cancel with these documents:');
    console.log(`   - Go to http://localhost:3000/documents`);
    console.log(`   - Switch to "📦 Quản lý lưu trữ" tab`);
    console.log(`   - You should see ${documents.length} new completed documents`);
    console.log(`   - Click "Thanh lý" or "Hủy" button to test\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  createCompletedDocuments();
}

module.exports = { createCompletedDocuments };
