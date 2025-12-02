/**
 * Test Document Filters API
 * 
 * Test API endpoint với filter mới:
 * - document_type_id
 * - confidential_level
 * - Kết hợp với phân quyền
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAPI(token, userId, testName, url) {
  const fetch = (await import('node-fetch')).default;
  
  try {
    const response = await fetch(`http://localhost:4000/api/v1${url}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.log(`   ❌ ${testName}: ${response.status} - ${data.message || 'Error'}`);
      return null;
    }

    const docs = data.data?.documents || [];
    console.log(`   ✅ ${testName}: ${docs.length} documents`);
    
    // Show first 3 docs
    if (docs.length > 0) {
      docs.slice(0, 3).forEach(doc => {
        console.log(`      - ${doc.id}: ${doc.title || doc.original_file_name} (Type: ${doc.document_type?.name || 'N/A'}, Level: ${doc.confidential_level})`);
      });
      if (docs.length > 3) {
        console.log(`      ... and ${docs.length - 3} more`);
      }
    }
    
    return docs;
  } catch (error) {
    console.log(`   ❌ ${testName}: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🧪 Testing Document Filters API\n');

  // Get admin user
  const admin = await prisma.users.findFirst({
    where: { email: 'admin@acme.local' },
    include: { tenant: true }
  });

  if (!admin) {
    console.error('❌ Admin user not found');
    return;
  }

  // Generate JWT token for admin
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  
  const adminToken = jwt.sign(
    {
      userId: admin.id,
      tenantId: admin.tenant_id,
      email: admin.email,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  console.log(`👤 Testing as: ${admin.email}\n`);

  // Get document types for testing
  const docTypes = await prisma.document_types.findMany({
    where: { tenant_id: admin.tenant_id },
    take: 2
  });

  if (docTypes.length < 2) {
    console.error('❌ Need at least 2 document types');
    return;
  }

  console.log('📄 Available Document Types:');
  docTypes.forEach(dt => console.log(`   ${dt.id}: ${dt.name}`));
  console.log('');

  // Test 1: No filter (all documents)
  console.log('Test 1: No filter');
  await testAPI(adminToken, admin.id, 'All documents', '/documents?page=1&limit=5');
  console.log('');

  // Test 2: Filter by document type
  console.log('Test 2: Filter by document type');
  await testAPI(adminToken, admin.id, `Type: ${docTypes[0].name}`, `/documents?page=1&limit=5&document_type_id=${docTypes[0].id}`);
  console.log('');

  // Test 3: Filter by confidential level - normal
  console.log('Test 3: Filter by confidential level - normal');
  await testAPI(adminToken, admin.id, 'Level: normal', '/documents?page=1&limit=5&confidential_level=normal');
  console.log('');

  // Test 4: Filter by confidential level - confidential
  console.log('Test 4: Filter by confidential level - confidential');
  await testAPI(adminToken, admin.id, 'Level: confidential', '/documents?page=1&limit=5&confidential_level=confidential');
  console.log('');

  // Test 5: Filter by confidential level - secret
  console.log('Test 5: Filter by confidential level - secret');
  await testAPI(adminToken, admin.id, 'Level: secret', '/documents?page=1&limit=5&confidential_level=secret');
  console.log('');

  // Test 6: Combined filter
  console.log('Test 6: Combined filter (type + level)');
  await testAPI(adminToken, admin.id, `Type: ${docTypes[0].name} + Level: normal`, `/documents?page=1&limit=5&document_type_id=${docTypes[0].id}&confidential_level=normal`);
  console.log('');

  // Test 7: Combined with status
  console.log('Test 7: Triple filter (type + level + status)');
  await testAPI(adminToken, admin.id, 'Type + Level + Status', `/documents?page=1&limit=5&document_type_id=${docTypes[0].id}&confidential_level=normal&status=active`);
  console.log('');

  // Test 8: Combined with search
  console.log('Test 8: Filter + Search');
  await testAPI(adminToken, admin.id, 'Type + Search', `/documents?page=1&limit=5&document_type_id=${docTypes[0].id}&search=test`);
  console.log('');

  console.log('✅ API tests completed!\n');
  console.log('💡 Test in browser:');
  console.log('   1. Open http://localhost:3000/documents');
  console.log('   2. Try different filter combinations');
  console.log('   3. Check pagination works with filters');
  console.log('   4. Verify permissions are enforced');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
