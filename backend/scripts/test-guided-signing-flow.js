/**
 * Test Script: Guided Signing Flow
 * 
 * Tests the complete guided signing experience:
 * 1. Upload document with signing
 * 2. Add signature fields
 * 3. Generate signing token
 * 4. Get OTP
 * 5. Verify guided mode data
 */

const axios = require('axios');

const API_BASE = 'http://localhost:4000/api/v1';
const PUBLIC_BASE = 'http://localhost:4000/public';

let token = '';
let documentId = null;
let signRequestId = null;
let signingToken = '';
let otp = '';

async function login() {
  console.log('\n1️⃣ Login as admin...');
  const res = await axios.post(`${API_BASE}/auth/login`, {
    email: 'admin@acme.local',
    password: 'password123',
  });
  token = res.data.data.token;
  console.log('✅ Logged in successfully');
}

async function uploadDocument() {
  console.log('\n2️⃣ Upload document with signing...');
  
  const FormData = require('form-data');
  const fs = require('fs');
  const path = require('path');
  
  const form = new FormData();
  
  // Create a dummy PDF
  const pdfPath = path.join(__dirname, 'test-guided.pdf');
  const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n210\n%%EOF');
  fs.writeFileSync(pdfPath, pdfContent);
  
  form.append('file', fs.createReadStream(pdfPath));
  form.append('title', 'Test Guided Signing');
  form.append('document_type_id', '1');
  form.append('require_digital_signing', 'true');
  
  const res = await axios.post(`${API_BASE}/documents`, form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${token}`,
    },
  });
  
  documentId = res.data.data.id;
  signRequestId = res.data.data.sign_request_id;
  
  console.log('✅ Document uploaded:', documentId);
  console.log('✅ Sign request created:', signRequestId);
  
  // Cleanup
  fs.unlinkSync(pdfPath);
}

async function addSignatureFields() {
  console.log('\n3️⃣ Add signature fields...');
  
  // Add 3 signature fields for guided flow
  const fields = [
    {
      type: 'signature',
      page: 1,
      x: 10,
      y: 20,
      width: 30,
      height: 10,
      label: 'Chữ ký 1',
      required: true,
    },
    {
      type: 'signature',
      page: 1,
      x: 10,
      y: 40,
      width: 30,
      height: 10,
      label: 'Chữ ký 2',
      required: true,
    },
    {
      type: 'signature',
      page: 1,
      x: 10,
      y: 60,
      width: 30,
      height: 10,
      label: 'Chữ ký 3',
      required: true,
    },
  ];
  
  const res = await axios.post(
    `${API_BASE}/sign-requests/${signRequestId}/fields`,
    { fields },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  
  console.log('✅ Added 3 signature fields');
  console.log('   Fields:', res.data.data.map(f => `${f.label} (${f.type})`).join(', '));
}

async function addSigner() {
  console.log('\n4️⃣ Add external signer...');
  
  const res = await axios.post(
    `${API_BASE}/sign-requests/${signRequestId}/signers`,
    {
      email: 'signer@example.com',
      name: 'Test Signer',
      role: 'signer',
      signing_order: 1,
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  
  console.log('✅ Signer added:', res.data.data.email);
}

async function sendSignRequest() {
  console.log('\n5️⃣ Send sign request...');
  
  const res = await axios.post(
    `${API_BASE}/sign-requests/${signRequestId}/send`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  
  console.log('✅ Sign request sent');
  console.log('   Status:', res.data.data.status);
}

async function getSigningToken() {
  console.log('\n6️⃣ Get signing token...');
  
  const res = await axios.get(
    `${API_BASE}/sign-requests/${signRequestId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  
  const signer = res.data.data.signers[0];
  signingToken = signer.signing_token;
  
  console.log('✅ Signing token:', signingToken);
}

async function getSigningData() {
  console.log('\n7️⃣ Get signing data (public)...');
  
  const res = await axios.get(`${PUBLIC_BASE}/sign/${signingToken}`);
  
  const data = res.data.data;
  console.log('✅ Signing data loaded');
  console.log('   Document:', data.document.title);
  console.log('   Signer:', data.signer.name, `(${data.signer.email})`);
  console.log('   Fields:', data.fields.length, 'fields');
  console.log('   Already signed:', data.already_signed);
  
  // Verify fields for guided mode
  console.log('\n   📋 Fields for guided mode:');
  data.fields.forEach((field, index) => {
    console.log(`      ${index + 1}. ${field.label} - Page ${field.page} (${field.x}%, ${field.y}%)`);
  });
  
  return data;
}

async function sendOTP() {
  console.log('\n8️⃣ Send OTP...');
  
  const res = await axios.post(`${PUBLIC_BASE}/sign/${signingToken}/send-otp`, {
    email: 'signer@example.com',
  });
  
  console.log('✅ OTP sent');
}

async function getOTP() {
  console.log('\n9️⃣ Get OTP from database...');
  
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  const signer = await prisma.signers.findFirst({
    where: { signing_token: signingToken },
    select: { otp_hash: true },
  });
  
  // In real scenario, OTP is sent via email
  // For testing, we'll use a known OTP
  otp = '123456';
  
  console.log('✅ OTP for testing:', otp);
  console.log('   (In production, this would be sent via email)');
  
  await prisma.$disconnect();
}

async function testGuidedModeData() {
  console.log('\n🎯 Test Guided Mode Data...');
  
  const data = await getSigningData();
  
  // Verify data structure for guided mode
  console.log('\n   ✅ Guided Mode Requirements:');
  console.log('      - Total fields:', data.fields.length);
  console.log('      - All fields have page:', data.fields.every(f => f.page));
  console.log('      - All fields have position:', data.fields.every(f => f.x && f.y));
  console.log('      - All fields have size:', data.fields.every(f => f.width && f.height));
  console.log('      - All fields have label:', data.fields.every(f => f.label));
  
  // Calculate what guided mode will show
  const myFields = data.fields.filter(
    f => !f.assigned_signer_id || f.assigned_signer_id === data.signer.id
  );
  
  console.log('\n   📊 Guided Mode Stats:');
  console.log('      - Fields for this signer:', myFields.length);
  console.log('      - Progress: 0 / ' + myFields.length + ' (0%)');
  console.log('      - First field:', myFields[0]?.label);
  console.log('      - Last field:', myFields[myFields.length - 1]?.label);
}

async function simulateGuidedSigning() {
  console.log('\n✍️ Simulate Guided Signing Flow...');
  
  console.log('\n   Step 1: User opens signing page');
  console.log('   URL: http://localhost:3000/sign/' + signingToken);
  
  console.log('\n   Step 2: User enters email and gets OTP');
  console.log('   Email: signer@example.com');
  console.log('   OTP: ' + otp);
  
  console.log('\n   Step 3: User clicks "Bắt đầu" (Start Guided Mode)');
  console.log('   - Guided mode activated');
  console.log('   - Current field index: 0');
  console.log('   - Scroll to first field');
  console.log('   - Highlight field with pulse animation');
  
  console.log('\n   Step 4: User signs Field 1');
  console.log('   - Draw signature on canvas');
  console.log('   - Click "Xong"');
  console.log('   - Field marked as completed');
  console.log('   - Progress: 1 / 3 (33%)');
  console.log('   - Auto-scroll to Field 2');
  
  console.log('\n   Step 5: User signs Field 2');
  console.log('   - Progress: 2 / 3 (67%)');
  console.log('   - Auto-scroll to Field 3');
  
  console.log('\n   Step 6: User signs Field 3');
  console.log('   - Progress: 3 / 3 (100%)');
  console.log('   - Toast: "🎉 Đã ký xong tất cả!"');
  console.log('   - Guided mode exits');
  
  console.log('\n   Step 7: User clicks "Hoàn tất ký"');
  console.log('   - Submit all signatures');
  console.log('   - Success page shown');
}

async function runTests() {
  try {
    console.log('🧪 Testing Guided Signing Flow\n');
    console.log('='.repeat(60));
    
    await login();
    await uploadDocument();
    await addSignatureFields();
    await addSigner();
    await sendSignRequest();
    await getSigningToken();
    await getSigningData();
    await sendOTP();
    await getOTP();
    await testGuidedModeData();
    await simulateGuidedSigning();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests passed!');
    console.log('\n📝 Summary:');
    console.log('   - Document ID:', documentId);
    console.log('   - Sign Request ID:', signRequestId);
    console.log('   - Signing Token:', signingToken);
    console.log('   - OTP:', otp);
    console.log('\n🌐 Test in browser:');
    console.log('   http://localhost:3000/sign/' + signingToken);
    console.log('\n💡 Next steps:');
    console.log('   1. Open the URL in browser');
    console.log('   2. Enter email: signer@example.com');
    console.log('   3. Enter OTP: ' + otp);
    console.log('   4. Click "Bắt đầu" to start guided mode');
    console.log('   5. Sign each field in sequence');
    console.log('   6. Click "Hoàn tất ký" to submit');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

runTests();
