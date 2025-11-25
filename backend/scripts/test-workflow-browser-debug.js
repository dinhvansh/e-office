/**
 * Test workflow API - Browser Debug Version
 * Copy this to browser console to test
 */

// Step 1: Get token from localStorage
const authData = JSON.parse(localStorage.getItem('esign.auth') || '{}');
const token = authData.tokens?.accessToken;

console.log('🔑 Token:', token ? 'Found' : 'Not found');

if (!token) {
  console.error('❌ No token found. Please login first.');
} else {
  // Step 2: Call workflow API
  fetch('http://localhost:4000/api/v1/workflows/8', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(res => res.json())
  .then(data => {
    console.log('✅ API Response:', data);
    
    const workflow = data.workflow || data;
    console.log('📋 Workflow:', workflow.name);
    console.log('📝 Steps:', workflow.steps?.length || 0);
    
    if (workflow.steps) {
      workflow.steps.forEach((step, i) => {
        console.log(`\n🔍 Step ${i + 1}:`, step.step_name);
        console.log('   - approver_type:', step.approver_type);
        console.log('   - approver_name:', step.approver_name);
        console.log('   - approver_email:', step.approver_email);
        console.log('   - Has name?', !!step.approver_name);
        console.log('   - Has email?', !!step.approver_email);
      });
    }
  })
  .catch(err => {
    console.error('❌ Error:', err);
  });
}
