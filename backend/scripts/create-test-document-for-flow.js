/**
 * Create test document for internal-to-external flow
 */

const axios = require('axios');

const API_BASE = 'http://localhost:4000/api/v1';

async function createTestDocument() {
  console.log('🔐 Logging in as admin...');
  
  // Login
  const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
    email: 'admin@acme.local',
    password: 'password123'
  });
  
  const token = loginResponse.data.data.tokens.accessToken;
  console.log('✅ Logged in');
  
  // Create document
  console.log('\n📄 Creating test document...');
  const docResponse = await axios.post(
    `${API_BASE}/documents`,
    {
      title: 'Test Contract - Internal to External Flow',
      document_type_id: 2, // Hợp đồng
      require_digital_signing: true,
      workflow_type: 'sequential',
      file_path: 'uploads/test-contract.pdf', // Dummy path
      file_size: 1024,
      mime_type: 'application/pdf'
    },
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  
  const doc = docResponse.data.data;
  console.log('✅ Document created');
  console.log(`   ID: ${doc.id}`);
  console.log(`   Sign Request ID: ${doc.sign_request_id}`);
  
  return doc;
}

createTestDocument()
  .then(() => console.log('\n✅ Done'))
  .catch(err => console.error('❌ Error:', err.response?.data || err.message));
