const fetch = require('node-fetch');

const API_URL = 'http://localhost:4000/api/v1';
const ADMIN_EMAIL = 'admin@acme.local';
const ADMIN_PASSWORD = 'admin123';

async function login() {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });
  
  const data = await response.json();
  if (!data.success) {
    throw new Error(`Login failed: ${data.error?.message}`);
  }
  
  return data.data.tokens.accessToken;
}

async function testDocumentFilters(token) {
  console.log('\n📋 Testing Document Filters...\n');
  
  // Test 1: Get all documents
  console.log('1️⃣ Get all documents:');
  const allDocs = await fetch(`${API_URL}/documents?page=1&limit=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const allData = await allDocs.json();
  console.log(`   Total: ${allData.data.pagination.total} documents`);
  
  // Test 2: Filter by status
  console.log('\n2️⃣ Filter by status:');
  const statuses = ['draft', 'pending_approval', 'completed', 'archived', 'cancelled'];
  
  for (const status of statuses) {
    const response = await fetch(`${API_URL}/documents?page=1&limit=10&status=${status}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    console.log(`   ${status}: ${data.data.pagination.total} documents`);
  }
  
  // Test 3: Search
  console.log('\n3️⃣ Search documents:');
  const searchTerms = ['CV', 'Hợp đồng', 'test'];
  
  for (const term of searchTerms) {
    const response = await fetch(`${API_URL}/documents?page=1&limit=10&search=${encodeURIComponent(term)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    console.log(`   Search "${term}": ${data.data.pagination.total} results`);
  }
}

async function testArchiveCancel(token) {
  console.log('\n📦 Testing Archive & Cancel...\n');
  
  // Get a completed document
  const response = await fetch(`${API_URL}/documents?page=1&limit=10&status=completed`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  
  if (data.data.documents.length === 0) {
    console.log('⚠️  No completed documents found. Create one first.');
    return;
  }
  
  const doc = data.data.documents[0];
  console.log(`Found completed document: #${doc.id} - ${doc.title || doc.original_file_name}`);
  
  // Test archive
  console.log('\n1️⃣ Testing Archive:');
  const archiveResponse = await fetch(`${API_URL}/documents/${doc.id}/archive`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const archiveData = await archiveResponse.json();
  
  if (archiveData.success) {
    console.log('   ✅ Document archived successfully');
    
    // Verify status
    const checkResponse = await fetch(`${API_URL}/documents/${doc.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const checkData = await checkResponse.json();
    console.log(`   Status: ${checkData.data.document.status}`);
  } else {
    console.log(`   ❌ Archive failed: ${archiveData.error?.message}`);
  }
  
  // Get another completed document for cancel test
  const response2 = await fetch(`${API_URL}/documents?page=1&limit=10&status=completed`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data2 = await response2.json();
  
  if (data2.data.documents.length === 0) {
    console.log('\n⚠️  No more completed documents for cancel test.');
    return;
  }
  
  const doc2 = data2.data.documents[0];
  console.log(`\nFound another completed document: #${doc2.id} - ${doc2.title || doc2.original_file_name}`);
  
  // Test cancel
  console.log('\n2️⃣ Testing Cancel:');
  const cancelResponse = await fetch(`${API_URL}/documents/${doc2.id}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const cancelData = await cancelResponse.json();
  
  if (cancelData.success) {
    console.log('   ✅ Document cancelled successfully');
    
    // Verify status
    const checkResponse = await fetch(`${API_URL}/documents/${doc2.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const checkData = await checkResponse.json();
    console.log(`   Status: ${checkData.data.document.status}`);
  } else {
    console.log(`   ❌ Cancel failed: ${cancelData.error?.message}`);
  }
}

async function main() {
  try {
    console.log('🔐 Logging in...');
    const token = await login();
    console.log('✅ Login successful\n');
    
    await testDocumentFilters(token);
    await testArchiveCancel(token);
    
    console.log('\n✅ All tests completed!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
