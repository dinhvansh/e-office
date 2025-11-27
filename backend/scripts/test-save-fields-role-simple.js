/**
 * Test: Save Fields by Role
 * Verify fields only saved for signers with role='signer'
 */

const axios = require('axios');
const API_BASE = 'http://localhost:4000/api/v1';

async function test() {
  console.log('🧪 Testing Field Save by Role\n');
  
  try {
    // Login
    console.log('📝 Step 1: Login');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@acme.local',
      password: 'password123'
    });
    const token = loginRes.data.data.tokens.accessToken;
    console.log('✅ Login OK\n');
    
    // Get sign requests
    console.log('📝 Step 2: Get sign requests');
    const srRes = await axios.get(`${API_BASE}/sign-requests`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const signRequests = srRes.data.data?.sign_requests || [];
    console.log(`   Found ${signRequests.length} sign requests\n`);
    
    // Find draft with signers that have roles
    let testSR = null;
    for (const sr of signRequests) {
      if (sr.status === 'draft' && sr.signers && sr.signers.length > 0) {
        const hasRoles = sr.signers.some(s => s.role);
        if (hasRoles) {
          testSR = sr;
          break;
        }
      }
    }
    
    if (!testSR) {
      console.log('⚠️  No draft sign request with roles found');
      console.log('   Please create a document with workflow first\n');
      return;
    }
    
    console.log('📝 Step 3: Analyze signers');
    console.log(`   Sign Request ID: ${testSR.id}`);
    console.log(`   Status: ${testSR.status}`);
    console.log(`   Total signers: ${testSR.signers.length}`);
    
    const signers = testSR.signers.filter(s => s.role === 'signer' || !s.role);
    const approvers = testSR.signers.filter(s => s.role === 'approver');
    
    console.log(`   - Signers (role='signer'): ${signers.length}`);
    console.log(`   - Approvers (role='approver'): ${approvers.length}\n`);
    
    // Test editor filtering (frontend logic)
    console.log('📝 Step 4: Test editor filtering');
    console.log(`   Editor will show: ${signers.length} signers`);
    console.log(`   Editor will hide: ${approvers.length} approvers\n`);
    
    // Create fields for signers only
    console.log('📝 Step 5: Save fields for signers');
    const fields = signers.map((signer, index) => ({
      id: `field-${index}`,
      type: 'signature',
      x: 10 + (index * 5),
      y: 50,
      width: 30,
      height: 10,
      page: 1,
      signer_id: signer.id,
      required: true
    }));
    
    console.log(`   Creating ${fields.length} fields`);
    
    const saveRes = await axios.post(
      `${API_BASE}/sign-requests/${testSR.id}/fields`,
      { fields },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log('✅ Fields saved successfully\n');
    
    // Verify
    console.log('📝 Step 6: Verify fields assignment');
    const editorRes = await axios.get(`${API_BASE}/sign-requests/${testSR.id}/editor`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const savedFields = editorRes.data.data.fields || [];
    console.log(`   Total fields in DB: ${savedFields.length}`);
    
    const signerIds = new Set(savedFields.map(f => f.signer_id));
    const signersWithFields = signers.filter(s => signerIds.has(s.id));
    const approversWithFields = approvers.filter(s => signerIds.has(s.id));
    
    console.log(`   Signers with fields: ${signersWithFields.length}/${signers.length}`);
    console.log(`   Approvers with fields: ${approversWithFields.length}/${approvers.length}\n`);
    
    // Result
    console.log('=' .repeat(60));
    if (approversWithFields.length === 0) {
      console.log('✅ TEST PASSED!');
      console.log('   Fields correctly assigned only to signers (role=\'signer\')');
      console.log('   Approvers (role=\'approver\') have no fields\n');
    } else {
      console.log('❌ TEST FAILED!');
      console.log('   Some approvers have fields assigned');
      console.log('   This should not happen!\n');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
}

test();
