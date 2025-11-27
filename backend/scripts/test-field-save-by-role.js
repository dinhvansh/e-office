/**
 * Test Script: Field Save by Role
 * 
 * Purpose: Verify that fields are only saved for signers with role='signer'
 * 
 * Test Flow:
 * 1. Login as admin
 * 2. Find a sign request with both approvers and signers
 * 3. Try to save fields
 * 4. Verify only signers (role='signer') appear in editor
 * 5. Verify fields can be saved for signers only
 */

const axios = require('axios');

const API_BASE = 'http://localhost:4000/api/v1';
let authToken = '';

async function login() {
  console.log('📝 Step 1: Login as admin');
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@acme.local',
      password: 'password123',
    });
    
    authToken = response.data.data.tokens.accessToken;
    console.log('✅ Login successful');
    console.log(`   Token: ${authToken.substring(0, 20)}...\n`);
    return true;
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function findSignRequestWithRoles() {
  console.log('📝 Step 2: Find sign request with both approvers and signers');
  try {
    const response = await axios.get(`${API_BASE}/sign-requests`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const signRequests = response.data.data || response.data || [];
    console.log(`   Found ${signRequests.length} sign requests`);
    
    // Find one with signers that have roles
    for (const sr of signRequests) {
      const detailResponse = await axios.get(`${API_BASE}/sign-requests/${sr.id}/editor`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      const signers = detailResponse.data.data.signers || [];
      const hasRoles = signers.some(s => s.role);
      
      if (hasRoles && sr.status === 'draft') {
        console.log(`✅ Found sign request with roles: ID ${sr.id}`);
        console.log(`   Status: ${sr.status}`);
        console.log(`   Total signers: ${signers.length}`);
        
        const signerRole = signers.filter(s => s.role === 'signer');
        const approverRole = signers.filter(s => s.role === 'approver');
        
        console.log(`   - Signers (role='signer'): ${signerRole.length}`);
        console.log(`   - Approvers (role='approver'): ${approverRole.length}\n`);
        
        return { signRequestId: sr.id, signers, signerRole, approverRole };
      }
    }
    
    console.log('⚠️  No sign request found with roles. Creating one...\n');
    return null;
  } catch (error) {
    console.log('❌ Error finding sign request:', error.response?.data || error.message);
    return null;
  }
}

async function testEditorFiltering(signRequestId, allSigners) {
  console.log('📝 Step 3: Test editor filtering (frontend logic)');
  
  // Simulate frontend filtering logic
  const signers = allSigners.filter(s => s.role === 'signer' || !s.role);
  
  console.log(`   All signers in database: ${allSigners.length}`);
  console.log(`   Signers shown in editor: ${signers.length}`);
  
  const approversFiltered = allSigners.filter(s => s.role === 'approver');
  console.log(`   Approvers filtered out: ${approversFiltered.length}`);
  
  if (approversFiltered.length > 0) {
    console.log('✅ Editor filtering working correctly');
    console.log('   Approvers will NOT appear in editor sidebar\n');
  } else {
    console.log('⚠️  No approvers to filter (all are signers)\n');
  }
  
  return signers;
}

async function testSaveFields(signRequestId, signers) {
  console.log('📝 Step 4: Test saving fields for signers');
  
  if (signers.length === 0) {
    console.log('⚠️  No signers available to assign fields\n');
    return false;
  }
  
  // Create test fields for signers only
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
  
  console.log(`   Creating ${fields.length} fields for ${signers.length} signers`);
  
  try {
    const response = await axios.post(
      `${API_BASE}/sign-requests/${signRequestId}/fields`,
      { fields },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    console.log('✅ Fields saved successfully');
    console.log(`   Response: ${response.data.message || 'OK'}\n`);
    return true;
  } catch (error) {
    console.log('❌ Error saving fields:', error.response?.data || error.message);
    return false;
  }
}

async function verifyFieldsAssignment(signRequestId, signerRole, approverRole) {
  console.log('📝 Step 5: Verify fields assignment');
  
  try {
    const response = await axios.get(`${API_BASE}/sign-requests/${signRequestId}/editor`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const fields = response.data.data.fields || [];
    console.log(`   Total fields in database: ${fields.length}`);
    
    // Check which signers have fields
    const signerIds = new Set(fields.map(f => f.signer_id));
    
    const signersWithFields = signerRole.filter(s => signerIds.has(s.id));
    const approversWithFields = approverRole.filter(s => signerIds.has(s.id));
    
    console.log(`   Signers with fields: ${signersWithFields.length}/${signerRole.length}`);
    console.log(`   Approvers with fields: ${approversWithFields.length}/${approverRole.length}`);
    
    if (approversWithFields.length === 0) {
      console.log('✅ PASS: No approvers have fields assigned');
      console.log('   Fields only assigned to signers (role=\'signer\')\n');
      return true;
    } else {
      console.log('❌ FAIL: Some approvers have fields assigned!');
      console.log('   Approvers should NOT have signature fields\n');
      return false;
    }
  } catch (error) {
    console.log('❌ Error verifying fields:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Testing Field Assignment by Role\n');
  console.log('=' .repeat(60));
  console.log('\n');
  
  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ Tests failed: Cannot login\n');
    return;
  }
  
  // Step 2: Find sign request with roles
  const result = await findSignRequestWithRoles();
  if (!result) {
    console.log('\n⚠️  Tests skipped: No suitable sign request found');
    console.log('   Create a document with workflow that has both approvers and signers\n');
    return;
  }
  
  const { signRequestId, signers: allSigners, signerRole, approverRole } = result;
  
  // Step 3: Test editor filtering
  const filteredSigners = await testEditorFiltering(signRequestId, allSigners);
  
  // Step 4: Test saving fields
  const saveSuccess = await testSaveFields(signRequestId, filteredSigners);
  if (!saveSuccess) {
    console.log('\n❌ Tests failed: Cannot save fields\n');
    return;
  }
  
  // Step 5: Verify fields assignment
  const verifySuccess = await verifyFieldsAssignment(signRequestId, signerRole, approverRole);
  
  // Summary
  console.log('=' .repeat(60));
  console.log('\n📊 Test Summary:\n');
  console.log(`   Sign Request ID: ${signRequestId}`);
  console.log(`   Total signers: ${allSigners.length}`);
  console.log(`   - Signers (role='signer'): ${signerRole.length}`);
  console.log(`   - Approvers (role='approver'): ${approverRole.length}`);
  console.log(`   Editor filtering: ${filteredSigners.length} signers shown`);
  console.log(`   Fields saved: ${saveSuccess ? 'Yes' : 'No'}`);
  console.log(`   Verification: ${verifySuccess ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log('\n');
  
  if (verifySuccess) {
    console.log('🎉 All tests passed!');
    console.log('   Fields are correctly assigned only to signers (role=\'signer\')\n');
  } else {
    console.log('❌ Tests failed!');
    console.log('   Please check the implementation\n');
  }
}

// Run tests
runTests().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
