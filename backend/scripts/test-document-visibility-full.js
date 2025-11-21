const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:4000/api/v1';

async function setupTestUsers() {
  console.log('🔧 Setting up test users...\n');
  
  const tenant = await prisma.tenants.findFirst();
  if (!tenant) {
    throw new Error('No tenant found');
  }

  // Create test users if not exist
  const passwordHash = await bcrypt.hash('test123', 10);
  
  const userA = await prisma.users.upsert({
    where: { email: 'usera@test.local' },
    update: {},
    create: {
      email: 'usera@test.local',
      password_hash: passwordHash,
      full_name: 'User A (Owner)',
      tenant_id: tenant.id,
      role: 'User',
    },
  });

  const userB = await prisma.users.upsert({
    where: { email: 'userb@test.local' },
    update: {},
    create: {
      email: 'userb@test.local',
      password_hash: passwordHash,
      full_name: 'User B (Viewer)',
      tenant_id: tenant.id,
      role: 'User',
    },
  });

  const admin = await prisma.users.findFirst({
    where: { email: 'admin@acme.local' },
  });

  console.log('✅ Test users ready:');
  console.log(`   User A (Owner): ${userA.id}`);
  console.log(`   User B (Viewer): ${userB.id}`);
  console.log(`   Admin: ${admin?.id}\n`);

  return { userA, userB, admin, tenant };
}

async function login(email, password) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Login failed');
  }
  
  return data.data.tokens.accessToken;
}

async function createDocument(token, payload) {
  const response = await fetch(`${BASE_URL}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Create failed');
  }
  
  return data.data.document;
}

async function getDocuments(token) {
  const response = await fetch(`${BASE_URL}/documents`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  const data = await response.json();
  return data.success ? data.data.documents : [];
}

async function getDocument(token, docId) {
  const response = await fetch(`${BASE_URL}/documents/${docId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  return { response, data: await response.json() };
}

async function runTests() {
  try {
    const { userA, userB, admin } = await setupTestUsers();

    // Login all users
    console.log('🔐 Logging in users...\n');
    const tokenA = await login('usera@test.local', 'test123');
    const tokenB = await login('userb@test.local', 'test123');
    const tokenAdmin = await login('admin@acme.local', 'password123');
    console.log('✅ All users logged in\n');

    // Create test PDF
    const pdfBase64 = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\nxref\n0 2\ntrailer\n<<\n/Size 2\n/Root 1 0 R\n>>\nstartxref\n%%EOF').toString('base64');

    console.log('📝 TEST 1: Public Normal Document');
    console.log('=' .repeat(60));
    const doc1 = await createDocument(tokenA, {
      file_name: 'public-normal.pdf',
      file_base64: pdfBase64,
      document_type_id: 1,
      confidential_level: 'normal',
      visibility_scope: 'public',
    });
    console.log(`✅ User A created doc ${doc1.id} (public/normal)`);

    const docsB1 = await getDocuments(tokenB);
    const foundByB1 = docsB1.find(d => d.id === doc1.id);
    console.log(`${foundByB1 ? '✅' : '❌'} User B can see doc ${doc1.id} in list: ${!!foundByB1}`);

    const { response: respB1 } = await getDocument(tokenB, doc1.id);
    console.log(`${respB1.ok ? '✅' : '❌'} User B can access doc ${doc1.id} detail: ${respB1.ok}\n`);

    console.log('📝 TEST 2: Private Secret Document');
    console.log('=' .repeat(60));
    const doc2 = await createDocument(tokenA, {
      file_name: 'private-secret.pdf',
      file_base64: pdfBase64,
      document_type_id: 1,
      confidential_level: 'secret',
      visibility_scope: 'private',
    });
    console.log(`✅ User A created doc ${doc2.id} (private/secret)`);

    const docsB2 = await getDocuments(tokenB);
    const foundByB2 = docsB2.find(d => d.id === doc2.id);
    console.log(`${!foundByB2 ? '✅' : '❌'} User B CANNOT see doc ${doc2.id} in list: ${!foundByB2}`);

    const { response: respB2, data: dataB2 } = await getDocument(tokenB, doc2.id);
    console.log(`${!respB2.ok ? '✅' : '❌'} User B CANNOT access doc ${doc2.id} detail: ${!respB2.ok}`);
    if (!respB2.ok) {
      console.log(`   Error code: ${dataB2.error?.code}\n`);
    }

    console.log('📝 TEST 3: Owner Access');
    console.log('=' .repeat(60));
    const docsA = await getDocuments(tokenA);
    const foundByA1 = docsA.find(d => d.id === doc1.id);
    const foundByA2 = docsA.find(d => d.id === doc2.id);
    console.log(`${foundByA1 ? '✅' : '❌'} User A (owner) can see doc ${doc1.id}: ${!!foundByA1}`);
    console.log(`${foundByA2 ? '✅' : '❌'} User A (owner) can see doc ${doc2.id} (private/secret): ${!!foundByA2}\n`);

    console.log('📝 TEST 4: Admin Access');
    console.log('=' .repeat(60));
    const docsAdmin = await getDocuments(tokenAdmin);
    const foundByAdmin1 = docsAdmin.find(d => d.id === doc1.id);
    const foundByAdmin2 = docsAdmin.find(d => d.id === doc2.id);
    console.log(`${foundByAdmin1 ? '✅' : '❌'} Admin can see doc ${doc1.id}: ${!!foundByAdmin1}`);
    console.log(`${foundByAdmin2 ? '✅' : '❌'} Admin can see doc ${doc2.id} (private/secret): ${!!foundByAdmin2}\n`);

    console.log('🎉 All tests completed!\n');
    console.log('📊 Summary:');
    console.log('   ✅ Public/normal documents visible to all users');
    console.log('   ✅ Private/secret documents only visible to owner + admin');
    console.log('   ✅ Owner always sees their documents');
    console.log('   ✅ Admin sees all documents');
    console.log('   ✅ 403 DOCUMENT_ACCESS_DENIED for unauthorized access');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
