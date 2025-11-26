const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:4000/api/v1';

async function testCreateSignRequest() {
  try {
    console.log('🧪 Testing Create Sign Request...\n');

    // Step 1: Login
    console.log('1️⃣ Login as admin...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@acme.local',
      password: 'password123',
    });
    const token = loginRes.data.data.tokens.accessToken;
    console.log('✅ Login successful\n');

    // Step 2: Get document types
    console.log('2️⃣ Get document types...');
    const docTypesRes = await axios.get(`${API_BASE}/document-types`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const docTypes = docTypesRes.data.data || docTypesRes.data;
    const signDocType = docTypes.find(dt => dt.require_digital_signing);
    console.log(`✅ Found document type: ${signDocType.name} (ID: ${signDocType.id})\n`);

    // Step 3: Read test PDF and convert to base64
    console.log('3️⃣ Reading test PDF...');
    const pdfPath = path.join(__dirname, '../test-data/test-contract.pdf');
    
    if (!fs.existsSync(pdfPath)) {
      console.log('❌ Test PDF not found, creating dummy PDF...');
      // Create a minimal PDF
      const dummyPdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\n0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n210\n%%EOF');
      fs.writeFileSync(pdfPath, dummyPdf);
    }
    
    const pdfBuffer = fs.readFileSync(pdfPath);
    const base64 = pdfBuffer.toString('base64');
    console.log(`✅ PDF loaded: ${(base64.length / 1024).toFixed(2)} KB\n`);

    // Step 4: Create document with signers
    console.log('4️⃣ Creating document with signers...');
    const payload = {
      file_name: 'test-contract.pdf',
      file_base64: base64,
      document_type_id: signDocType.id,
      signers: [
        {
          email: 'signer1@example.com',
          name: 'Người ký 1',
          order: 1,
          type: 'manual',
        },
        {
          email: 'signer2@example.com',
          name: 'Người ký 2',
          order: 2,
          type: 'manual',
        },
      ],
    };

    console.log('📤 Payload:', JSON.stringify(payload, null, 2).substring(0, 500) + '...\n');

    const createRes = await axios.post(`${API_BASE}/documents`, payload, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const document = createRes.data.data.document || createRes.data.data;
    console.log('✅ Document created:', {
      id: document.id,
      sign_request_id: document.sign_request_id,
      status: document.status,
    });

    console.log('\n🎉 Test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

testCreateSignRequest();
