/**
 * Test User with Position and Manager
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:4000/api/v1';
let token = '';

async function login() {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@acme.local',
      password: 'password123',
    }),
  });
  const data = await res.json();
  
  if (!res.ok || !data.data?.tokens?.accessToken) {
    console.error('Login failed:', data);
    throw new Error('Login failed');
  }
  
  token = data.data.tokens.accessToken;
  console.log('✅ Logged in as admin@acme.local\n');
}

async function testGetPositions() {
  console.log('📝 Test 1: GET /positions (Get available positions)');
  
  const res = await fetch(`${API_BASE}/positions`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  const data = await res.json();
  
  if (res.ok && data.data?.positions) {
    console.log(`✅ PASS: Got ${data.data.positions.length} positions`);
    return data.data.positions[0]?.id; // Return first position ID
  } else {
    console.log('❌ FAIL:', data);
    return null;
  }
}

async function testGetUsers() {
  console.log('\n📝 Test 2: GET /users (Get available users for manager)');
  
  const res = await fetch(`${API_BASE}/users`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  const data = await res.json();
  const users = data.data?.users || data.data || [];
  
  if (res.ok && users.length > 0) {
    console.log(`✅ PASS: Got ${users.length} users`);
    return users[0]?.id; // Return first user ID for manager
  } else {
    console.log('❌ FAIL:', data);
    return null;
  }
}

async function testCreateUserWithPositionAndManager(positionId, managerId) {
  console.log('\n📝 Test 3: POST /users (Create with position + manager)');
  
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      email: `test.full.${Date.now()}@test.com`,
      password: 'password123',
      full_name: 'Test User Full Profile',
      phone: '0912345678',
      position_id: positionId,
      manager_id: managerId,
    }),
  });
  
  const data = await res.json();
  const user = data.data?.user || data.data;
  
  if (res.ok && user?.id) {
    console.log(`✅ PASS: Created user ID ${user.id}`);
    console.log(`   Position: ${user.position?.name || 'None'}`);
    console.log(`   Manager: ${user.manager?.full_name || user.manager?.email || 'None'}`);
    return user.id;
  } else {
    console.log('❌ FAIL:', data);
    return null;
  }
}

async function testGetUserWithRelations(userId) {
  console.log(`\n📝 Test 4: GET /users/${userId} (Check relations)`);
  
  const res = await fetch(`${API_BASE}/users/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  const data = await res.json();
  const user = data.data?.user || data.data;
  
  if (res.ok && user?.id) {
    console.log(`✅ PASS: Got user - ${user.full_name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Phone: ${user.phone || 'None'}`);
    console.log(`   Department: ${user.department?.name || 'None'}`);
    console.log(`   Position: ${user.position?.name || 'None'} (${user.position?.code || 'N/A'})`);
    console.log(`   Manager: ${user.manager?.full_name || user.manager?.email || 'None'}`);
    console.log(`   Roles: ${user.user_roles?.length || 0}`);
  } else {
    console.log('❌ FAIL:', data);
  }
}

async function testUpdateUserPositionAndManager(userId, newPositionId, newManagerId) {
  console.log(`\n📝 Test 5: PUT /users/${userId} (Update position + manager)`);
  
  const res = await fetch(`${API_BASE}/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      position_id: newPositionId,
      manager_id: newManagerId,
    }),
  });
  
  const data = await res.json();
  const user = data.data?.user || data.data;
  
  if (res.ok && user?.id) {
    console.log(`✅ PASS: Updated user`);
    console.log(`   New Position: ${user.position?.name || 'None'}`);
    console.log(`   New Manager: ${user.manager?.full_name || user.manager?.email || 'None'}`);
  } else {
    console.log('❌ FAIL:', data);
  }
}

async function testListUsersWithRelations() {
  console.log('\n📝 Test 6: GET /users (List with position + manager)');
  
  const res = await fetch(`${API_BASE}/users`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  const data = await res.json();
  const users = data.data?.users || data.data || [];
  
  if (res.ok && users.length > 0) {
    console.log(`✅ PASS: Got ${users.length} users`);
    
    const usersWithPosition = users.filter((u) => u.position);
    const usersWithManager = users.filter((u) => u.manager);
    
    console.log(`   Users with position: ${usersWithPosition.length}`);
    console.log(`   Users with manager: ${usersWithManager.length}`);
    
    if (usersWithPosition.length > 0) {
      const sample = usersWithPosition[0];
      console.log(`   Sample: ${sample.full_name || sample.email}`);
      console.log(`     → Position: ${sample.position.name} (${sample.position.code})`);
    }
    
    if (usersWithManager.length > 0) {
      const sample = usersWithManager[0];
      console.log(`   Sample: ${sample.full_name || sample.email}`);
      console.log(`     → Manager: ${sample.manager.full_name || sample.manager.email}`);
    }
  } else {
    console.log('❌ FAIL:', data);
  }
}

async function testDeleteUser(userId) {
  console.log(`\n📝 Test 7: DELETE /users/${userId}`);
  
  const res = await fetch(`${API_BASE}/users/${userId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  const data = await res.json();
  
  if (res.ok) {
    console.log(`✅ PASS: Deleted user ID ${userId}`);
  } else {
    console.log('❌ FAIL:', data);
  }
}

async function main() {
  try {
    await login();
    
    const positionId = await testGetPositions();
    const managerId = await testGetUsers();
    
    if (!positionId || !managerId) {
      console.log('\n❌ Cannot proceed without position or manager');
      return;
    }
    
    const newUserId = await testCreateUserWithPositionAndManager(positionId, managerId);
    
    if (newUserId) {
      await testGetUserWithRelations(newUserId);
      
      // Get another position and manager for update test
      const positions = await fetch(`${API_BASE}/positions`, {
        headers: { 'Authorization': `Bearer ${token}` },
      }).then(r => r.json());
      
      const newPositionId = positions.data?.positions[1]?.id || positionId;
      
      const users = await fetch(`${API_BASE}/users`, {
        headers: { 'Authorization': `Bearer ${token}` },
      }).then(r => r.json());
      
      const usersArray = users.data?.users || users.data || [];
      const newManagerId = usersArray.find((u) => u.id !== newUserId && u.id !== managerId)?.id || managerId;
      
      await testUpdateUserPositionAndManager(newUserId, newPositionId, newManagerId);
      await testListUsersWithRelations();
      await testDeleteUser(newUserId);
    }
    
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
