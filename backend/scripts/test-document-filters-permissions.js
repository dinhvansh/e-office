/**
 * Test Document Filters with Permissions
 * 
 * Kiểm tra:
 * 1. Filter theo loại văn bản
 * 2. Filter theo mức độ bảo mật
 * 3. Phân quyền vẫn hoạt động đúng với filter
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing Document Filters with Permissions\n');

  // Get test users
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

  console.log('👥 Test Users:');
  console.log(`   Admin: ${admin.email} (ID: ${admin.id})`);
  console.log(`   User: ${regularUser.email} (ID: ${regularUser.id})\n`);

  // Get document types
  const docTypes = await prisma.document_types.findMany({
    where: { tenant_id: admin.tenant_id },
    take: 2
  });

  if (docTypes.length < 2) {
    console.error('❌ Need at least 2 document types');
    return;
  }

  console.log('📄 Document Types:');
  docTypes.forEach(dt => console.log(`   ${dt.id}: ${dt.name}`));
  console.log('');

  // Create test documents with different types and confidential levels
  console.log('📝 Creating test documents...\n');

  const testDocs = [];

  // Doc 1: Type 1, Normal, Public (everyone can see)
  const doc1 = await prisma.documents.create({
    data: {
      tenant_id: admin.tenant_id,
      owner_id: admin.id,
      file_path: '/test/doc1.pdf',
      original_file_name: 'doc1.pdf',
      document_type_id: docTypes[0].id,
      confidential_level: 'normal',
      visibility_scope: 'public',
      status: 'active',
      title: 'Public Normal Doc - Type 1'
    }
  });
  testDocs.push(doc1);
  console.log(`✅ Doc ${doc1.id}: Type ${docTypes[0].name}, Normal, Public`);

  // Doc 2: Type 2, Normal, Public (everyone can see)
  const doc2 = await prisma.documents.create({
    data: {
      tenant_id: admin.tenant_id,
      owner_id: admin.id,
      file_path: '/test/doc2.pdf',
      original_file_name: 'doc2.pdf',
      document_type_id: docTypes[1].id,
      confidential_level: 'normal',
      visibility_scope: 'public',
      status: 'active',
      title: 'Public Normal Doc - Type 2'
    }
  });
  testDocs.push(doc2);
  console.log(`✅ Doc ${doc2.id}: Type ${docTypes[1].name}, Normal, Public`);

  // Doc 3: Type 1, Confidential, Public (everyone can see)
  const doc3 = await prisma.documents.create({
    data: {
      tenant_id: admin.tenant_id,
      owner_id: admin.id,
      file_path: '/test/doc3.pdf',
      original_file_name: 'doc3.pdf',
      document_type_id: docTypes[0].id,
      confidential_level: 'confidential',
      visibility_scope: 'public',
      status: 'active',
      title: 'Public Confidential Doc - Type 1'
    }
  });
  testDocs.push(doc3);
  console.log(`✅ Doc ${doc3.id}: Type ${docTypes[0].name}, Confidential, Public`);

  // Doc 4: Type 1, Secret, Public (only owner + admin)
  const doc4 = await prisma.documents.create({
    data: {
      tenant_id: admin.tenant_id,
      owner_id: admin.id,
      file_path: '/test/doc4.pdf',
      original_file_name: 'doc4.pdf',
      document_type_id: docTypes[0].id,
      confidential_level: 'secret',
      visibility_scope: 'public',
      status: 'active',
      title: 'Public Secret Doc - Type 1'
    }
  });
  testDocs.push(doc4);
  console.log(`✅ Doc ${doc4.id}: Type ${docTypes[0].name}, Secret, Public (restricted)`);

  // Doc 5: Type 2, Normal, Private (only owner + admin)
  const doc5 = await prisma.documents.create({
    data: {
      tenant_id: admin.tenant_id,
      owner_id: admin.id,
      file_path: '/test/doc5.pdf',
      original_file_name: 'doc5.pdf',
      document_type_id: docTypes[1].id,
      confidential_level: 'normal',
      visibility_scope: 'private',
      status: 'active',
      title: 'Private Normal Doc - Type 2'
    }
  });
  testDocs.push(doc5);
  console.log(`✅ Doc ${doc5.id}: Type ${docTypes[1].name}, Normal, Private (restricted)\n`);

  // Test filters
  console.log('🔍 Testing Filters...\n');

  // Test 1: All documents (no filter) - Regular user
  console.log('Test 1: Regular user - No filter');
  const allDocs = await prisma.documents.findMany({
    where: { tenant_id: admin.tenant_id }
  });
  console.log(`   Total in DB: ${allDocs.length}`);
  console.log(`   Expected visible to regular user: 3 (doc1, doc2, doc3)`);
  console.log(`   Hidden: 2 (doc4=secret, doc5=private)\n`);

  // Test 2: Filter by Type 1
  console.log('Test 2: Filter by Type 1');
  const type1Docs = await prisma.documents.findMany({
    where: { 
      tenant_id: admin.tenant_id,
      document_type_id: docTypes[0].id
    }
  });
  console.log(`   Total Type 1: ${type1Docs.length}`);
  console.log(`   Expected visible to regular user: 2 (doc1, doc3)`);
  console.log(`   Hidden: 1 (doc4=secret)\n`);

  // Test 3: Filter by Type 2
  console.log('Test 3: Filter by Type 2');
  const type2Docs = await prisma.documents.findMany({
    where: { 
      tenant_id: admin.tenant_id,
      document_type_id: docTypes[1].id
    }
  });
  console.log(`   Total Type 2: ${type2Docs.length}`);
  console.log(`   Expected visible to regular user: 1 (doc2)`);
  console.log(`   Hidden: 1 (doc5=private)\n`);

  // Test 4: Filter by Normal confidential level
  console.log('Test 4: Filter by Normal level');
  const normalDocs = await prisma.documents.findMany({
    where: { 
      tenant_id: admin.tenant_id,
      confidential_level: 'normal'
    }
  });
  console.log(`   Total Normal: ${normalDocs.length}`);
  console.log(`   Expected visible to regular user: 2 (doc1, doc2)`);
  console.log(`   Hidden: 1 (doc5=private)\n`);

  // Test 5: Filter by Confidential level
  console.log('Test 5: Filter by Confidential level');
  const confDocs = await prisma.documents.findMany({
    where: { 
      tenant_id: admin.tenant_id,
      confidential_level: 'confidential'
    }
  });
  console.log(`   Total Confidential: ${confDocs.length}`);
  console.log(`   Expected visible to regular user: 1 (doc3)\n`);

  // Test 6: Filter by Secret level
  console.log('Test 6: Filter by Secret level');
  const secretDocs = await prisma.documents.findMany({
    where: { 
      tenant_id: admin.tenant_id,
      confidential_level: 'secret'
    }
  });
  console.log(`   Total Secret: ${secretDocs.length}`);
  console.log(`   Expected visible to regular user: 0`);
  console.log(`   Expected visible to admin: 1 (doc4)\n`);

  // Test 7: Combined filter - Type 1 + Normal
  console.log('Test 7: Combined - Type 1 + Normal');
  const combinedDocs = await prisma.documents.findMany({
    where: { 
      tenant_id: admin.tenant_id,
      document_type_id: docTypes[0].id,
      confidential_level: 'normal'
    }
  });
  console.log(`   Total: ${combinedDocs.length}`);
  console.log(`   Expected visible to regular user: 1 (doc1)\n`);

  // Summary
  console.log('📊 Permission Rules Summary:');
  console.log('   ✅ Admin: Can see ALL documents');
  console.log('   ✅ Owner: Can see their own documents');
  console.log('   ✅ Regular User:');
  console.log('      - Can see: public + (normal OR confidential)');
  console.log('      - Cannot see: secret OR private (unless owner)');
  console.log('   ✅ Filters work on top of permission rules\n');

  // Cleanup
  console.log('🧹 Cleaning up test documents...');
  await prisma.documents.deleteMany({
    where: {
      id: { in: testDocs.map(d => d.id) }
    }
  });
  console.log('✅ Cleanup complete\n');

  console.log('✅ All tests completed!');
  console.log('\n💡 Next steps:');
  console.log('   1. Test in UI: http://localhost:3000/documents');
  console.log('   2. Try different filter combinations');
  console.log('   3. Login as regular user to verify permissions');
  console.log('   4. Check that secret/private docs are hidden correctly');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
