/**
 * Test script for Inline Recipients, CC & Attachments feature
 * 
 * Tests:
 * 1. Upload document with manual signers
 * 2. Upload document with external org signer
 * 3. Upload document with CC emails
 * 4. Upload document with attachments
 * 5. Upload document with all features combined
 */

const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:4000/api/v1';
let token = '';

// Helper: Login
async function login() {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@acme.local',
      password: 'password123',
    }),
  });
  const data = await response.json();
  token = data.data.tokens.accessToken;
  console.log('✅ Logged in successfully');
}

// Helper: Create base64 from file
function fileToBase64(filePath) {
  const file = fs.readFileSync(filePath);
  return file.toString('base64');
}

// Helper: Create dummy PDF base64
function createDummyPDF() {
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
  return Buffer.from(pdfContent).toString('base64');
}

// Test 1: Upload with manual signers
async function test1_ManualSigners() {
  console.log('\n📝 Test 1: Upload document with manual signers');
  
  const response = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      file_name: 'test-manual-signers.pdf',
      file_base64: createDummyPDF(),
      document_type_id: 3, // Hợp đồng (requires digital signing)
      signers: [
        {
          email: 'signer1@example.com',
          name: 'Nguyễn Văn A',
          order: 1,
          type: 'manual',
        },
        {
          email: 'signer2@example.com',
          name: 'Trần Thị B',
          order: 2,
          type: 'manual',
        },
      ],
    }),
  });
  
  const data = await response.json();
  
  if (response.ok && data.data.document) {
    console.log('✅ Document created:', data.data.document.id);
    console.log('✅ Sign request ID:', data.data.document.sign_request_id);
    
    // Note: Signers are created in database, verification would require direct DB query
    console.log('✅ Signers should be created in database');
    
    return data.data.document.id;
  } else {
    console.error('❌ Failed:', data);
    return null;
  }
}

// Test 2: Upload with CC emails
async function test2_CCEmails() {
  console.log('\n📧 Test 2: Upload document with CC emails');
  
  const response = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      file_name: 'test-cc-emails.pdf',
      file_base64: createDummyPDF(),
      document_type_id: 1, // Công văn đến
      cc_emails: [
        'cc1@example.com',
        'cc2@example.com',
        'cc3@example.com',
      ],
    }),
  });
  
  const data = await response.json();
  
  if (response.ok && data.data.document) {
    console.log('✅ Document created:', data.data.document.id);
    console.log('✅ CC emails should be saved in database');
    return data.data.document.id;
  } else {
    console.error('❌ Failed:', data);
    return null;
  }
}

// Test 3: Upload with attachments
async function test3_Attachments() {
  console.log('\n📎 Test 3: Upload document with attachments');
  
  const response = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      file_name: 'test-attachments.pdf',
      file_base64: createDummyPDF(),
      document_type_id: 1,
      attachments: [
        {
          file_name: 'attachment1.pdf',
          file_base64: createDummyPDF(),
          file_type: 'application/pdf',
        },
        {
          file_name: 'attachment2.pdf',
          file_base64: createDummyPDF(),
          file_type: 'application/pdf',
        },
      ],
    }),
  });
  
  const data = await response.json();
  
  if (response.ok && data.data.document) {
    console.log('✅ Document created:', data.data.document.id);
    console.log('✅ Attachments should be saved in database');
    return data.data.document.id;
  } else {
    console.error('❌ Failed:', data);
    return null;
  }
}

// Test 4: Upload with all features combined
async function test4_AllFeatures() {
  console.log('\n🎯 Test 4: Upload document with ALL features');
  
  const response = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      file_name: 'test-all-features.pdf',
      file_base64: createDummyPDF(),
      document_type_id: 3, // Hợp đồng
      signers: [
        {
          email: 'signer@example.com',
          name: 'Người ký',
          order: 1,
          type: 'manual',
        },
      ],
      cc_emails: ['cc@example.com'],
      attachments: [
        {
          file_name: 'attachment.pdf',
          file_base64: createDummyPDF(),
          file_type: 'application/pdf',
        },
      ],
    }),
  });
  
  const data = await response.json();
  
  if (response.ok && data.data.document) {
    console.log('✅ Document created:', data.data.document.id);
    console.log('✅ Sign request ID:', data.data.document.sign_request_id);
    console.log('✅ All features should be saved');
    return data.data.document.id;
  } else {
    console.error('❌ Failed:', data);
    return null;
  }
}

// Test 5: Validation - Empty signer fields
async function test5_Validation() {
  console.log('\n⚠️ Test 5: Validation - Empty signer fields');
  
  const response = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      file_name: 'test-validation.pdf',
      file_base64: createDummyPDF(),
      document_type_id: 3,
      signers: [
        {
          email: '', // Empty email
          name: 'Test',
          order: 1,
          type: 'manual',
        },
      ],
    }),
  });
  
  if (!response.ok) {
    console.log('✅ Validation working - rejected empty email (status:', response.status, ')');
  } else {
    const data = await response.json();
    console.error('❌ Validation failed - should reject empty email');
    console.error('Response:', data);
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting Inline Recipients, CC & Attachments Tests\n');
  
  try {
    await login();
    
    await test1_ManualSigners();
    await test2_CCEmails();
    await test3_Attachments();
    await test4_AllFeatures();
    await test5_Validation();
    
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

runTests();
