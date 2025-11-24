const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:4000/api/v1';

async function quickCreateSignRequest() {
  try {
    console.log('🚀 Quick Create Sign Request\n');

    // Login
    console.log('1️⃣ Login...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@acme.local',
      password: 'password123'
    });
    const token = loginRes.data.data.tokens.accessToken;
    console.log('✅ Logged in\n');

    // Upload document
    console.log('2️⃣ Upload document...');
    const form = new FormData();
    
    // Use existing PDF or create minimal one
    const testPdfPath = path.join(__dirname, 'test.pdf');
    if (!fs.existsSync(testPdfPath)) {
      const pdfContent = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000052 00000 n
0000000101 00000 n
trailer<</Size 4/Root 1 0 R>>
startxref
190
%%EOF`;
      fs.writeFileSync(testPdfPath, pdfContent);
    }

    form.append('file', fs.createReadStream(testPdfPath));
    form.append('title', 'Test Document ' + Date.now());
    form.append('document_type_id', '1');
    form.append('require_digital_signing', 'true');

    const uploadRes = await axios.post(`${API_BASE}/documents`, form, {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${token}` }
    });

    const doc = uploadRes.data.data.document;
    const srId = doc.sign_request_id;
    console.log(`✅ Document: #${doc.id} (${doc.document_number})`);
    console.log(`✅ Sign Request: #${srId}\n`);

    // Add signers
    console.log('3️⃣ Add signers...');
    await axios.post(`${API_BASE}/sign-requests/${srId}/signers`, {
      email: 'dir.it@acme.local',
      name: 'Phạm Minh Tuấn',
      signing_order: 1
    }, { headers: { Authorization: `Bearer ${token}` } });
    console.log('✅ Signer 1: Trưởng IT (Order 1)');

    await axios.post(`${API_BASE}/sign-requests/${srId}/signers`, {
      email: 'admin@acme.local',
      name: 'Admin',
      signing_order: 2
    }, { headers: { Authorization: `Bearer ${token}` } });
    console.log('✅ Signer 2: Admin (Order 2)\n');

    // Add fields
    console.log('4️⃣ Add signature fields...');
    await axios.post(`${API_BASE}/sign-requests/${srId}/fields`, {
      fields: [
        { type: 'signature', page: 1, x: 10, y: 70, width: 200, height: 50, required: true },
        { type: 'signature', page: 1, x: 10, y: 20, width: 200, height: 50, required: true }
      ]
    }, { headers: { Authorization: `Bearer ${token}` } });
    console.log('✅ Added 2 fields\n');

    // Send
    console.log('5️⃣ Send sign request...');
    await axios.post(`${API_BASE}/sign-requests/${srId}/send`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Sent!\n');

    // Get tokens
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const signers = await prisma.signers.findMany({
      where: { sign_request_id: srId },
      orderBy: { signing_order: 'asc' }
    });
    await prisma.$disconnect();

    console.log('━'.repeat(60));
    console.log('\n✅ Sign Request Created!\n');
    console.log('📋 Sign Request ID:', srId);
    console.log('📄 Document:', doc.document_number);
    console.log('\n👥 Signing URLs:');
    signers.forEach((s, i) => {
      console.log(`\n${i + 1}. ${s.name} (Order ${s.signing_order})`);
      console.log(`   http://localhost:3000/sign/${s.signing_token}`);
    });
    console.log('\n🔗 View in dashboard:');
    console.log(`   http://localhost:3000/sign-requests`);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

quickCreateSignRequest();
