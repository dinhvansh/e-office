const fs = require('fs');
const path = require('path');

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

async function uploadDocument(token) {
  // Create a simple PDF for testing
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test Document) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000317 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
410
%%EOF`;

  const base64 = Buffer.from(pdfContent).toString('base64');

  const response = await fetch(`${BASE_URL}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      file_name: 'test-upload.pdf',
      file_base64: base64,
      document_type_id: 1, // Assuming document type 1 exists
      title: 'Test Upload Document',
      confidential_level: 'normal',
      visibility_scope: 'public',
    }),
  });

  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Upload failed');
  }
  
  return data.data.document;
}

async function main() {
  try {
    console.log('🔐 Logging in...');
    const token = await login();
    console.log('✅ Login successful\n');

    console.log('📤 Uploading test document...');
    const document = await uploadDocument(token);
    console.log('✅ Upload successful!\n');
    
    console.log('📄 Document created:');
    console.log(`   ID: ${document.id}`);
    console.log(`   File: ${document.file_path}`);
    console.log(`   Status: ${document.status}`);
    console.log(`\n🎉 You can now test View/Download with document ID: ${document.id}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
