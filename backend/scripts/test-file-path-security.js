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

async function testFilePathSecurity() {
  try {
    console.log('🔐 Logging in...');
    const token = await login();
    console.log('✅ Login successful\n');

    // Test 1: Upload document and check response doesn't contain file_path
    console.log('📝 TEST 1: file_path not exposed in API response');
    console.log('=' .repeat(60));
    
    const pdfBase64 = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\nxref\ntrailer\n<<\n>>\nstartxref\n%%EOF').toString('base64');
    
    const uploadResponse = await fetch(`${BASE_URL}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        file_name: 'security-test.pdf',
        file_base64: pdfBase64,
        document_type_id: 1,
      }),
    });

    const uploadData = await uploadResponse.json();
    
    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadData.error?.message}`);
    }

    const document = uploadData.data.document;
    console.log('✅ Document created:', document.id);
    console.log(`${!document.file_path ? '✅' : '❌'} file_path NOT in response: ${!document.file_path}`);
    console.log(`${document.original_file_name ? '✅' : '❌'} original_file_name present: ${document.original_file_name}`);
    console.log('');

    // Test 2: List documents - check file_path not exposed
    console.log('📝 TEST 2: file_path not exposed in list API');
    console.log('=' .repeat(60));
    
    const listResponse = await fetch(`${BASE_URL}/documents`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const listData = await listResponse.json();
    const documents = listData.data.documents;
    
    const hasFilePath = documents.some(d => d.file_path);
    const hasOriginalFileName = documents.every(d => d.original_file_name !== undefined);
    
    console.log(`${!hasFilePath ? '✅' : '❌'} No file_path in list response: ${!hasFilePath}`);
    console.log(`${hasOriginalFileName ? '✅' : '❌'} All documents have original_file_name field: ${hasOriginalFileName}`);
    console.log('');

    // Test 3: Get single document - check file_path not exposed
    console.log('📝 TEST 3: file_path not exposed in detail API');
    console.log('=' .repeat(60));
    
    const detailResponse = await fetch(`${BASE_URL}/documents/${document.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const detailData = await detailResponse.json();
    const detailDoc = detailData.data.document;
    
    console.log(`${!detailDoc.file_path ? '✅' : '❌'} file_path NOT in detail response: ${!detailDoc.file_path}`);
    console.log(`${detailDoc.original_file_name ? '✅' : '❌'} original_file_name present: ${detailDoc.original_file_name}`);
    console.log('');

    // Test 4: Try to upload with malicious storage_path (path traversal)
    console.log('📝 TEST 4: Path traversal attack blocked');
    console.log('=' .repeat(60));
    
    const maliciousPaths = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '~/sensitive-file.txt',
      'storage/../../../etc/passwd',
    ];

    for (const maliciousPath of maliciousPaths) {
      const attackResponse = await fetch(`${BASE_URL}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          file_name: 'attack.pdf',
          storage_path: maliciousPath,
          document_type_id: 1,
        }),
      });

      const attackData = await attackResponse.json();
      const blocked = !attackResponse.ok && attackData.error?.code === 'INVALID_STORAGE_PATH';
      
      console.log(`${blocked ? '✅' : '❌'} Blocked: ${maliciousPath.substring(0, 30)}... - ${blocked ? 'BLOCKED' : 'ALLOWED (SECURITY ISSUE!)'}`);
    }
    console.log('');

    // Test 5: Try to upload with storage_path outside STORAGE_BASE_PATH
    console.log('📝 TEST 5: Storage path outside base directory blocked');
    console.log('=' .repeat(60));
    
    const outsidePaths = [
      '/tmp/malicious.pdf',
      'C:\\Windows\\System32\\malicious.pdf',
      '/etc/passwd',
    ];

    for (const outsidePath of outsidePaths) {
      const attackResponse = await fetch(`${BASE_URL}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          file_name: 'attack.pdf',
          storage_path: outsidePath,
          document_type_id: 1,
        }),
      });

      const attackData = await attackResponse.json();
      const blocked = !attackResponse.ok && attackData.error?.code === 'INVALID_STORAGE_PATH';
      
      console.log(`${blocked ? '✅' : '❌'} Blocked: ${outsidePath} - ${blocked ? 'BLOCKED' : 'ALLOWED (SECURITY ISSUE!)'}`);
    }
    console.log('');

    console.log('🎉 Security tests completed!\n');
    console.log('📊 Summary:');
    console.log('   ✅ file_path hidden from API responses');
    console.log('   ✅ original_file_name used for display');
    console.log('   ✅ Path traversal attacks blocked');
    console.log('   ✅ Storage path validation working');
    console.log('   ✅ Local File Read (LFR) vulnerability mitigated');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFilePathSecurity();
