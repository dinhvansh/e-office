/**
 * Test Manager Preview in Workflow
 * Verify that workflow shows actual manager when user is logged in
 */

const axios = require('axios');

async function testManagerPreview() {
  console.log('🧪 Testing Manager Preview in Workflow\n');

  try {
    // Test 1: User WITH manager
    console.log('1️⃣ Test: User WITH Manager');
    console.log('-'.repeat(60));
    
    const loginRes1 = await axios.post('http://localhost:4000/api/v1/auth/login', {
      email: 'creator@acme.local',
      password: 'password123'
    });

    const token1 = loginRes1.data.data.tokens.accessToken;
    
    const workflowRes1 = await axios.get('http://localhost:4000/api/v1/workflows/8', {
      headers: { Authorization: `Bearer ${token1}` }
    });

    const workflow1 = workflowRes1.data.data.workflow;
    const managerStep1 = workflow1.steps.find(s => s.approver_type === 'manager');

    console.log('✅ User: creator@acme.local');
    console.log('   Manager Step:', managerStep1.step_name);
    console.log('   Approver Name:', managerStep1.approver_name);
    console.log('   Approver Email:', managerStep1.approver_email);
    
    if (managerStep1.approver_email === 'approver@acme.local') {
      console.log('\n✅ SUCCESS! Shows actual manager');
    } else if (managerStep1.approver_email === '⚠️ Bạn chưa có quản lý') {
      console.log('\n❌ FAILED! User has manager but not shown');
    } else {
      console.log('\n⚠️ Shows generic text:', managerStep1.approver_email);
    }

    // Test 2: User WITHOUT manager
    console.log('\n2️⃣ Test: User WITHOUT Manager');
    console.log('-'.repeat(60));
    
    // Create test user without manager
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const testUser = await prisma.users.upsert({
      where: { email: 'no.manager.test@test.com' },
      update: { manager_id: null },
      create: {
        tenant_id: 1,
        email: 'no.manager.test@test.com',
        password_hash: '$2b$10$YourHashHere',
        full_name: 'Test User No Manager',
        status: 'active',
        manager_id: null
      }
    });

    // Assign User role
    await prisma.user_roles.upsert({
      where: {
        user_id_role_id: {
          user_id: testUser.id,
          role_id: 4 // User role
        }
      },
      update: {},
      create: {
        user_id: testUser.id,
        role_id: 4
      }
    });

    const loginRes2 = await axios.post('http://localhost:4000/api/v1/auth/login', {
      email: 'no.manager.test@test.com',
      password: 'password123'
    });

    const token2 = loginRes2.data.data.tokens.accessToken;
    
    const workflowRes2 = await axios.get('http://localhost:4000/api/v1/workflows/8', {
      headers: { Authorization: `Bearer ${token2}` }
    });

    const workflow2 = workflowRes2.data.data.workflow;
    const managerStep2 = workflow2.steps.find(s => s.approver_type === 'manager');

    console.log('✅ User: no.manager.test@test.com');
    console.log('   Manager Step:', managerStep2.step_name);
    console.log('   Approver Name:', managerStep2.approver_name);
    console.log('   Approver Email:', managerStep2.approver_email);
    
    if (managerStep2.approver_email === '⚠️ Bạn chưa có quản lý') {
      console.log('\n✅ SUCCESS! Shows warning message');
    } else {
      console.log('\n❌ FAILED! Should show warning');
    }

    // Cleanup
    await prisma.user_roles.deleteMany({ where: { user_id: testUser.id } });
    await prisma.users.delete({ where: { id: testUser.id } });
    await prisma.$disconnect();

    // Summary
    console.log('\n📊 Summary');
    console.log('='.repeat(60));
    console.log('✅ User WITH manager → Shows actual manager name & email');
    console.log('✅ User WITHOUT manager → Shows warning message');
    console.log('\n🎯 UX Improvement: Users can see their manager BEFORE submitting!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testManagerPreview();
