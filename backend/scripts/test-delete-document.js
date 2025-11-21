const BASE_URL = 'http://localhost:4000/api/v1';

async function login() {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@acme.local',
      password: 'password123',
    }),
  });
  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Login failed');
  }
  
  return data.data.tokens.accessToken;
}

async function deleteDocument(token, docId) {
  const response = await fetch(`${BASE_URL}/documents/${docId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Delete failed');
  }
  
  return data;
}

async function main() {
  try {
    console.log('🔐 Logging in...');
    const token = await login();
    console.log('✅ Login successful\n');

    // Test with document ID 15 (just uploaded)
    const docId = 15;
    
    console.log(`🗑️  Deleting document ${docId}...`);
    const result = await deleteDocument(token, docId);
    console.log('✅ Delete successful!');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
