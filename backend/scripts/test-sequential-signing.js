const axios = require('axios');

const API_BASE = 'http://localhost:4000/api/v1';

async function testSequentialSigning() {
  try {
    console.log('🧪 Testing Sequential Signing Flow\n');

    // Step 1: Login as admin
    console.log('1️⃣ Login as admin...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@acme.local',
      password: 'password123'
    });
    
    const token = loginRes.data.data.tokens.accessToken;
    console.log('✅ Login successful\n');

    // Step 2: Upload document
    console.log('2️⃣ Upload test document...');
    const FormData = require('form-data');
    const fs = require('fs');
    const path = require('path');

    const form = new FormData();
    
    // Create a simple test PDF
    const testPdfPath = path.join(__dirname, 'test-sequential.pdf');
    if (!fs.existsSync(testPdfPath)) {
      // Create a minimal PDF
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
    form.append('title', 'Test Sequential Signing');
    form.append('document_type_id', '1');
    form.append('require_digital_signing', 'true');

    const uploadRes = await axios.post(`${API_BASE}/documents`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });

    const document = uploadRes.data.data.document;
    const signRequestId = document.sign_request_id;
    console.log(`✅ Document uploaded: #${document.id}`);
    console.log(`✅ Sign request created: #${signRequestId}\n`);

    // Step 3: Add signers with proper order
    console.log('3️⃣ Adding signers with sequential order...');
    
    // Signer 1: Trưởng IT (Order 1)
    await axios.post(`${API_BASE}/sign-requests/${signRequestId}/signers`, {
      email: 'dir.it@acme.local',
      name: 'Phạm Minh Tuấn',
      role: 'Trưởng phòng IT',
      signing_order: 1
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Added Signer 1: Trưởng IT (Order 1)');

    // Signer 2: Admin (Order 2)
    await axios.post(`${API_BASE}/sign-requests/${signRequestId}/signers`, {
      email: 'admin@acme.local',
      name: 'Admin',
      role: 'Giám đốc',
      signing_order: 2
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Added Signer 2: Admin (Order 2)\n');

    // Step 4: Add signature fields
    console.log('4️⃣ Adding signature fields...');
    await axios.post(`${API_BASE}/sign-requests/${signRequestId}/fields`, {
      fields: [
        {
          assigned_signer_id: null, // Will be assigned to first signer
          type: 'signature',
          page: 1,
          x: 10,
          y: 70,
          width: 200,
          height: 50,
          required: true,
          label: 'Chữ ký Trưởng IT'
        },
        {
          assigned_signer_id: null,
          type: 'signature',
          page: 1,
          x: 10,
          y: 20,
          width: 200,
          height: 50,
          required: true,
          label: 'Chữ ký Giám đốc'
        }
      ]
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Added 2 signature fields\n');

    // Step 5: Send sign request
    console.log('5️⃣ Sending sign request...');
    await axios.post(`${API_BASE}/sign-requests/${signRequestId}/send`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Sign request sent\n');

    // Step 6: Get signing tokens
    console.log('6️⃣ Getting signing tokens...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const signers = await prisma.signers.findMany({
      where: { sign_request_id: signRequestId },
      orderBy: { signing_order: 'asc' }
    });

    console.log('Signers:');
    signers.forEach((s, idx) => {
      console.log(`   ${idx + 1}. ${s.name} (Order ${s.signing_order})`);
      console.log(`      Token: ${s.signing_token?.substring(0, 20)}...`);
      console.log(`      URL: http://localhost:3000/sign/${s.signing_token}`);
    });

    await prisma.$disconnect();

    console.log('\n✅ Test setup complete!');
    console.log('\n📋 Next steps:');
    console.log('   1. Open first signer URL in browser');
    console.log('   2. Sign the document');
    console.log('   3. Check if status updates correctly');
    console.log('   4. Check if second signer can now sign');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

testSequentialSigning();
