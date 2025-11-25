/**
 * Debug workflow frontend issue
 * Test what frontend actually receives
 */

const axios = require('axios');

async function debugWorkflowFrontend() {
  console.log('🔍 Debugging Workflow Frontend Issue\n');

  try {
    // 1. Login
    console.log('1️⃣ Login as creator...');
    const loginRes = await axios.post('http://localhost:4000/api/v1/auth/login', {
      email: 'creator@acme.local',
      password: 'password123'
    });

    const token = loginRes.data.data.tokens.accessToken;
    console.log('✅ Logged in\n');

    // 2. Get workflow (same as frontend)
    console.log('2️⃣ GET /workflows/8 (HOPDONG)...');
    const workflowRes = await axios.get('http://localhost:4000/api/v1/workflows/8', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const response = workflowRes.data;
    console.log('📦 Raw Response Structure:');
    console.log('   - Has .data?', !!response.data);
    console.log('   - Has .workflow?', !!response.data?.workflow);
    console.log('');

    // 3. Parse like frontend does
    const data = response.data;
    const workflow = data?.workflow || data;
    
    console.log('🔍 Parsed Workflow:');
    console.log('   - ID:', workflow.id);
    console.log('   - Name:', workflow.name);
    console.log('   - Steps:', workflow.steps?.length || 0);
    console.log('');

    // 4. Check steps
    if (workflow.steps && workflow.steps.length > 0) {
      console.log('📋 Steps Detail:\n');
      workflow.steps.forEach((step, index) => {
        console.log(`Step ${index + 1}: ${step.step_name}`);
        console.log(`   - approver_type: ${step.approver_type}`);
        console.log(`   - approver_id: ${step.approver_id}`);
        console.log(`   - approver_name: ${step.approver_name || '❌ MISSING'}`);
        console.log(`   - approver_email: ${step.approver_email || '❌ MISSING'}`);
        console.log('');
      });

      // 5. Check condition
      const allHaveInfo = workflow.steps.every(s => s.approver_name && s.approver_email);
      
      if (allHaveInfo) {
        console.log('✅ ALL STEPS HAVE APPROVER INFO');
        console.log('\n🎯 Frontend should display:');
        workflow.steps.forEach((step, index) => {
          console.log(`   ${index + 1}. ${step.step_name}`);
          console.log(`      👤 ${step.approver_name}`);
          console.log(`      📧 ${step.approver_email}`);
        });
        
        console.log('\n💡 If frontend still not showing:');
        console.log('   1. Open DevTools Console (F12)');
        console.log('   2. Look for logs starting with 🔍 WorkflowPreview');
        console.log('   3. Check if approver_name and approver_email are present');
        console.log('   4. Try clearing React Query cache:');
        console.log('      - Open React DevTools');
        console.log('      - Go to Components tab');
        console.log('      - Find QueryClientProvider');
        console.log('      - Click "Clear cache"');
      } else {
        console.log('❌ SOME STEPS MISSING APPROVER INFO');
        const missing = workflow.steps.filter(s => !s.approver_name || !s.approver_email);
        console.log('   Missing:', missing.map(s => s.step_name).join(', '));
      }
    } else {
      console.log('❌ No steps found');
    }

    // 6. Full JSON
    console.log('\n📄 Full Response JSON:');
    console.log(JSON.stringify(workflow, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

debugWorkflowFrontend();
