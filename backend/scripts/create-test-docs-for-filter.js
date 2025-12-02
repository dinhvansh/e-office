/**
 * Create Test Documents for Filter Testing
 * 
 * Tạo documents với các loại và mức bảo mật khác nhau
 * để test filter và phân quyền
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('📝 Creating Test Documents for Filter Testing\n');

  // Get admin and regular user
  const admin = await prisma.users.findFirst({
    where: { email: 'admin@acme.local' }
  });

  const regularUser = await prisma.users.findFirst({
    where: { 
      email: { not: 'admin@acme.local' },
      tenant_id: admin.tenant_id
    }
  });

  if (!admin || !regularUser) {
    console.error('❌ Need admin and regular user');
    return;
  }

  console.log('👥 Users:');
  console.log(`   Admin: ${admin.email} (ID: ${admin.id})`);
  console.log(`   Regular: ${regularUser.email} (ID: ${regularUser.id})\n`);

  // Get document types
  const docTypes = await prisma.document_types.findMany({
    where: { tenant_id: admin.tenant_id },
    orderBy: { id: 'asc' }
  });

  console.log('📄 Document Types:');
  docTypes.forEach(dt => console.log(`   ${dt.id}: ${dt.name}`));
  console.log('');

  if (docTypes.length < 2) {
    console.error('❌ Need at least 2 document types');
    return;
  }

  const type1 = docTypes[0];
  const type2 = docTypes[1];

  console.log('🏗️  Creating test documents...\n');

  const testDocs = [];

  // Owned by Admin - Public documents
  console.log('📋 Admin-owned Public Documents:');
  
  const doc1 = await prisma.documents.create({
    data: {
      tenant_id: admin.tenant_id,
      owner_id: admin.id,
      file_path: '/test/filter-test-1.pdf',
      original_file_name: 'filter-test-1.pdf',
      document_type_id: type1.id,
      confidential_level: 'normal',
      visibility_scope: 'public',
      status: 'active',
      title: `[TEST] ${type1.name} - Normal - Public`
    }
  });
  testDocs.push(doc1);
  console.log(`   ✅ Doc ${doc1.id}: ${type1.name} / Normal / Public`);
  console.log(`      → Everyone can see`);

  const doc2 = await prisma.documents.create({
    data: {
      tenant_id: admin.tenant_id,
      owner_id: admin.id,
      file_path: '/test/filter-test-2.pdf',
      original_file_name: 'filter-test-2.pdf',
      document_type_id: type2.id,
      confidential_level: 'normal',
      visibility_scope: 'public',
      status: 'active',
      title: `[TEST] ${type2.name} - Normal - Public`
    }
  });
  testDocs.push(doc2);
  console.log(`   ✅ Doc ${doc2.id}: ${type2.name} / Normal / Public`);
  console.log(`      → Everyone can see`);

  const doc3 = await prisma.documents.create({
    data: {
      tenant_id: admin.tenant_id,
      owner_id: admin.id,
      file_path: '/test/filter-test-3.pdf',
      original_file_name: 'filter-test-3.pdf',
      document_type_id: type1.id,
      confidential_level: 'confidential',
      visibility_scope: 'public',
      status: 'active',
      title: `[TEST] ${type1.name} - Confidential - Public`
    }
  });
  testDocs.push(doc3);
  console.log(`   ✅ Doc ${doc3.id}: ${type1.name} / Confidential / Public`);
  console.log(`      → Everyone can see`);

  console.log('\n🔒 Admin-owned Restricted Documents:');

  const doc4 = await prisma.documents.create({
    data: {
      tenant_id: admin.tenant_id,
      owner_id: admin.id,
      file_path: '/test/filter-test-4.pdf',
      original_file_name: 'filter-test-4.pdf',
      document_type_id: type1.id,
      confidential_level: 'secret',
      visibility_scope: 'public',
      status: 'active',
      title: `[TEST] ${type1.name} - Secret - Public`
    }
  });
  testDocs.push(doc4);
  console.log(`   ✅ Doc ${doc4.id}: ${type1.name} / Secret / Public`);
  console.log(`      → Only Admin can see (secret level)`);

  const doc5 = await prisma.documents.create({
    data: {
      tenant_id: admin.tenant_id,
      owner_id: admin.id,
      file_path: '/test/filter-test-5.pdf',
      original_file_name: 'filter-test-5.pdf',
      document_type_id: type2.id,
      confidential_level: 'normal',
      visibility_scope: 'private',
      status: 'active',
      title: `[TEST] ${type2.name} - Normal - Private`
    }
  });
  testDocs.push(doc5);
  console.log(`   ✅ Doc ${doc5.id}: ${type2.name} / Normal / Private`);
  console.log(`      → Only Admin can see (private scope)`);

  console.log('\n👤 Regular User-owned Documents:');

  const doc6 = await prisma.documents.create({
    data: {
      tenant_id: admin.tenant_id,
      owner_id: regularUser.id,
      file_path: '/test/filter-test-6.pdf',
      original_file_name: 'filter-test-6.pdf',
      document_type_id: type1.id,
      confidential_level: 'normal',
      visibility_scope: 'public',
      status: 'active',
      title: `[TEST] ${type1.name} - Normal - Public (User-owned)`
    }
  });
  testDocs.push(doc6);
  console.log(`   ✅ Doc ${doc6.id}: ${type1.name} / Normal / Public`);
  console.log(`      → Everyone can see`);

  const doc7 = await prisma.documents.create({
    data: {
      tenant_id: admin.tenant_id,
      owner_id: regularUser.id,
      file_path: '/test/filter-test-7.pdf',
      original_file_name: 'filter-test-7.pdf',
      document_type_id: type1.id,
      confidential_level: 'secret',
      visibility_scope: 'private',
      status: 'active',
      title: `[TEST] ${type1.name} - Secret - Private (User-owned)`
    }
  });
  testDocs.push(doc7);
  console.log(`   ✅ Doc ${doc7.id}: ${type1.name} / Secret / Private`);
  console.log(`      → Only Regular User and Admin can see`);

  // Summary
  console.log('\n📊 Test Documents Summary:');
  console.log(`   Total created: ${testDocs.length}`);
  console.log('');
  console.log('   Visible to Admin: 7 (all)');
  console.log('   Visible to Regular User: 4 (doc1, doc2, doc3, doc6, doc7)');
  console.log('   Hidden from Regular User: 2 (doc4=secret, doc5=private)');
  console.log('');

  console.log('🧪 Test Scenarios:');
  console.log(`   1. Filter by "${type1.name}": Should show 5 docs (1,3,4,6,7)`);
  console.log(`      - Regular user sees: 4 (1,3,6,7)`);
  console.log(`      - Admin sees: 5 (all)`);
  console.log('');
  console.log(`   2. Filter by "${type2.name}": Should show 2 docs (2,5)`);
  console.log(`      - Regular user sees: 1 (2)`);
  console.log(`      - Admin sees: 2 (all)`);
  console.log('');
  console.log('   3. Filter by Normal: Should show 5 docs (1,2,5,6)');
  console.log('      - Regular user sees: 3 (1,2,6)');
  console.log('      - Admin sees: 4 (all except doc7)');
  console.log('');
  console.log('   4. Filter by Secret: Should show 2 docs (4,7)');
  console.log('      - Regular user sees: 1 (7 - owns it)');
  console.log('      - Admin sees: 2 (all)');
  console.log('');

  console.log('✅ Test documents created!\n');
  console.log('💡 Next steps:');
  console.log('   1. Login as admin@acme.local');
  console.log('   2. Go to http://localhost:3000/documents');
  console.log('   3. Try different filter combinations');
  console.log('   4. Login as regular user and verify permissions');
  console.log('');
  console.log('🧹 To cleanup: node backend/scripts/cleanup-test-docs.js');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
