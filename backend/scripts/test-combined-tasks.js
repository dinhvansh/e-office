const axios = require('axios');

const API_BASE = 'http://localhost:4000/api/v1';

async function testCombinedTasks() {
  console.log('🧪 Testing Combined Tasks API\n');

  try {
    // Step 1: Login as approver
    console.log('📝 Step 1: Login as approver');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'approver@acme.local',
      password: 'password123'
    });
    const token = loginRes.data.data.tokens.accessToken;
    console.log('✅ Login successful\n');

    const headers = { Authorization: `Bearer ${token}` };

    // Step 2: Get combined tasks (all)
    console.log('📋 Step 2: Get combined tasks (all types)');
    const allTasksRes = await axios.get(`${API_BASE}/approvals/my-tasks`, { headers });
    const allTasks = allTasksRes.data.data;
    
    console.log(`✅ Total tasks: ${allTasks.tasks.length}`);
    console.log(`   Statistics:`);
    console.log(`   - Total: ${allTasks.statistics.total}`);
    console.log(`   - Approval pending: ${allTasks.statistics.approval_pending}`);
    console.log(`   - Signing pending: ${allTasks.statistics.signing_pending}`);
    console.log(`   - Completed: ${allTasks.statistics.completed}\n`);

    // Show task breakdown
    const approvalTasks = allTasks.tasks.filter(t => t.task_type === 'approval');
    const signingTasks = allTasks.tasks.filter(t => t.task_type === 'signing');
    console.log(`   Task breakdown:`);
    console.log(`   - Approval tasks: ${approvalTasks.length}`);
    console.log(`   - Signing tasks: ${signingTasks.length}\n`);

    // Step 3: Filter by task type - approvals only
    console.log('📋 Step 3: Filter by task type (approval only)');
    const approvalOnlyRes = await axios.get(`${API_BASE}/approvals/my-tasks?task_type=approval`, { headers });
    const approvalOnly = approvalOnlyRes.data.data;
    console.log(`✅ Approval tasks: ${approvalOnly.tasks.length}`);
    console.log(`   All tasks are approval type: ${approvalOnly.tasks.every(t => t.task_type === 'approval')}\n`);

    // Step 4: Filter by task type - signing only
    console.log('📋 Step 4: Filter by task type (signing only)');
    const signingOnlyRes = await axios.get(`${API_BASE}/approvals/my-tasks?task_type=signing`, { headers });
    const signingOnly = signingOnlyRes.data.data;
    console.log(`✅ Signing tasks: ${signingOnly.tasks.length}`);
    console.log(`   All tasks are signing type: ${signingOnly.tasks.every(t => t.task_type === 'signing')}\n`);

    // Step 5: Show sample tasks
    console.log('📋 Step 5: Sample tasks');
    if (allTasks.tasks.length > 0) {
      const sampleTask = allTasks.tasks[0];
      console.log(`\nSample Task:`);
      console.log(`  Type: ${sampleTask.task_type}`);
      console.log(`  Document: ${sampleTask.document_title} (${sampleTask.document_number})`);
      console.log(`  Status: ${sampleTask.status}`);
      console.log(`  Owner: ${sampleTask.owner?.full_name || sampleTask.owner?.email}`);
      if (sampleTask.task_type === 'approval') {
        console.log(`  Workflow Step: ${sampleTask.workflow_step}`);
      } else {
        console.log(`  Signing Order: ${sampleTask.signing_order}`);
      }
    }

    console.log('\n✅ All tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

testCombinedTasks();
