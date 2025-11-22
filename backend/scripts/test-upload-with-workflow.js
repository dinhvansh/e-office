const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:4000/api/v1';

async function testUploadWithWorkflow() {
  // Login
  console.log('🔐 Logging in...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@acme.local',
      password: 'password123'
    })
  });
  
  const loginData = await loginRes.json();
  if (!loginData.success) {
    console.error('❌ Login failed:', loginData);
    return;
  }
  
  const token = loginData.data.tokens.accessToken;
  console.log('✅ Login success\n');
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  // Get document types
  console.log('📋 Getting document types...');
  const typesRes = await fetch(`${API_BASE}/document-types`, { headers });
  const typesData = await typesRes.json();
  const hopDongType = typesData.data.find(t => t.code === 'HOP_DONG');
  
  if (!hopDongType) {
    console.error('❌ Hợp đồng type not found');
    return;
  }
  
  console.log('✅ Found Hợp đồng type:', {
    id: hopDongType.id,
    require_digital_signing: hopDongType.require_digital_signing,
    require_approval: hopDongType.require_approval,
    default_workflow_id: hopDongType.default_workflow_id
  });
  console.log();
  
  // Create a dummy PDF
  const dummyPDF = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Resources <<\n/Font <<\n/F1 <<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\n>>\n>>\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Test Document) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000317 00000 n\ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n410\n%%EOF');
  const base64PDF = dummyPDF.toString('base64');
  
  // Upload document
  console.log('📤 Uploading document with Hợp đồng type...');
  const uploadRes = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      file_name: 'test-contract.pdf',
      file_base64: base64PDF,
      document_type_id: hopDongType.id,
      title: 'Test Contract with Workflow',
      confidential_level: 'normal',
      visibility_scope: 'public'
    })
  });
  
  const uploadData = await uploadRes.json();
  
  if (!uploadData.success) {
    console.error('❌ Upload failed:', uploadData);
    return;
  }
  
  const document = uploadData.data.document;
  console.log('✅ Document uploaded:', {
    id: document.id,
    title: document.title,
    sign_request_id: document.sign_request_id
  });
  console.log();
  
  if (!document.sign_request_id) {
    console.error('❌ No sign_request_id created!');
    return;
  }
  
  // Get sign request with signers
  console.log(`📋 Getting sign request ${document.sign_request_id}...`);
  const srRes = await fetch(`${API_BASE}/sign-requests/${document.sign_request_id}/editor`, { headers });
  const srData = await srRes.json();
  
  if (!srData.success) {
    console.error('❌ Failed to get sign request:', srData);
    return;
  }
  
  const signRequest = srData.data.signRequest;
  console.log('✅ Sign request:', {
    id: signRequest.id,
    title: signRequest.title,
    status: signRequest.status,
    signers_count: signRequest.signers?.length || 0
  });
  
  if (signRequest.signers && signRequest.signers.length > 0) {
    console.log('\n👥 Signers:');
    signRequest.signers.forEach((signer, i) => {
      console.log(`  ${i + 1}. ${signer.name} (${signer.email})`);
      console.log(`     Role: ${signer.role}, Order: ${signer.signing_order || 'N/A'}`);
    });
    console.log('\n✅ SUCCESS: Signers were auto-created from workflow!');
  } else {
    console.log('\n❌ FAILED: No signers created!');
  }
}

testUploadWithWorkflow().catch(console.error);
