const axios = require('axios');

const API_BASE = 'http://localhost:4000/api/v1';

async function testApprovalsList() {
  console.log('🧪 Testing Approvals List API\n');

  try {
    // Step 1: Login as admin (who has pending approvals)
    console.log('1️⃣ Login as admin...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@acme.local',
      password: 'password123'
    });
    
    console.log('✅ Login successful');
    
    const token = loginRes.data.data.tokens.accessToken;
    console.log('   Token:', token.substring(0, 30) + '...\n');

    // Step 2: Get my pending approvals
    console.log('2️⃣ Get my pending approvals...');
    const approvalsRes = await axios.get(`${API_BASE}/approvals/my-pending`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ API Response Status:', approvalsRes.status);
    console.log('   Response data structure:', Object.keys(approvalsRes.data));
    
    const approvals = approvalsRes.data.data;
    console.log('   Total approvals:', Array.isArray(approvals) ? approvals.length : 'NOT AN ARRAY');
    
    if (Array.isArray(approvals) && approvals.length > 0) {
      console.log('\n📋 First approval details:');
      const first = approvals[0];
      console.log('   ID:', first.id);
      console.log('   Document:', first.document?.title || 'N/A');
      console.log('   Workflow:', first.workflow?.name || 'N/A');
      console.log('   Step:', first.workflow_step?.step_name || 'N/A');
      console.log('   Action:', first.action);
      console.log('   Due date:', first.due_date);
      console.log('   Created:', first.created_at);
    } else if (Array.isArray(approvals)) {
      console.log('⚠️  No approvals found for this user');
    } else {
      console.log('❌ Response is not an array!');
      console.log('   Actual response:', JSON.stringify(approvals, null, 2));
    }

    // Step 3: Check database directly
    console.log('\n3️⃣ Checking database for approvals...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const dbApprovals = await prisma.document_approvals.findMany({
      where: {
        approver_user_id: loginRes.data.data.user.id,
        action: 'pending'
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            tenant_id: true
          }
        }
      },
      take: 5
    });

    console.log('   Database approvals count:', dbApprovals.length);
    if (dbApprovals.length > 0) {
      console.log('   First approval from DB:');
      console.log('     ID:', dbApprovals[0].id);
      console.log('     Document ID:', dbApprovals[0].document_id);
      console.log('     Document Title:', dbApprovals[0].document?.title);
      console.log('     Approver User ID:', dbApprovals[0].approver_user_id);
      console.log('     Action:', dbApprovals[0].action);
    }

    await prisma.$disconnect();

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed!');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Error:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

testApprovalsList();
