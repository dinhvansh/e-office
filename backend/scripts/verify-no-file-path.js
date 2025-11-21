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
    console.error('Login failed:', data);
    throw new Error(data.error?.message || 'Login failed');
  }
  return data.data.tokens.accessToken;
}

async function verify() {
  try {
    console.log('🔐 Logging in...');
    const token = await login();
    console.log('✅ Login successful\n');

    console.log('📄 Fetching documents...');
    const response = await fetch(`${BASE_URL}/documents`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await response.json();
    const documents = data.data.documents;

    console.log(`✅ Fetched ${documents.length} documents\n`);

    // Check first 3 documents
    const sample = documents.slice(0, 3);
    
    console.log('🔍 Checking sample documents:\n');
    sample.forEach(doc => {
      console.log(`Document #${doc.id}:`);
      console.log(`  ${doc.file_path ? '❌' : '✅'} file_path: ${doc.file_path ? 'EXPOSED (BAD!)' : 'hidden (good)'}`);
      console.log(`  ${doc.original_file_name ? '✅' : '❌'} original_file_name: ${doc.original_file_name || 'missing'}`);
      console.log('');
    });

    // Overall check
    const hasFilePath = documents.some(d => d.file_path);
    const allHaveOriginalFileName = documents.every(d => d.original_file_name);

    console.log('📊 Overall Status:');
    console.log(`  ${!hasFilePath ? '✅' : '❌'} No file_path exposed: ${!hasFilePath}`);
    console.log(`  ${allHaveOriginalFileName ? '✅' : '❌'} All have original_file_name: ${allHaveOriginalFileName}`);

    if (!hasFilePath && allHaveOriginalFileName) {
      console.log('\n🎉 Security check PASSED!');
    } else {
      console.log('\n⚠️  Security check FAILED!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verify();
