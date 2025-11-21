/**
 * Test Manager Field in Users
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

async function testGetUsers() {
  console.log('📝 Test 1: GET /users (Check manager field)');
  
  const res = await fetch(`${API_BASE}/users`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  const data = await res.json();
  
  const users = data.data?.users || data.data || [];
  
  if (res.ok && users.length > 0) {
    console.log(`✅ PASS: Got ${users.length} users`);
    
    const usersWithManager = users.filter(u => u.manager_id);
    console.log(`   Users with manager: ${usersWithManager.length}`);
    
    if (usersWithManager.length > 0) {
      const sample = usersWithManager[0];
      console.log(`   Sample: ${sample.full_name} → Manager ID: ${sample.manager_id}`);
    }
  } else {
    console.log('❌ FAIL:', data);
  }
  console.log('');
}

async function testCreateUserWithManager() {
  console.log('📝 Test 2: POST /users (Create with manager)');
  
  // Get first user to use as manager
  const usersRes = await fetch(`${API_BASE}/users`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const usersData = await usersRes.json();
  const users = usersData.data?.users || usersData.data || [];
  const managerId = users[0]?.id;
  
  if (!managerId) {
    console.log('❌ FAIL: No users found to use as manager');
    return null;
  }
  
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      email: `test.manager.${Date.now()}@test.com`,
      password: 'password123',
      full_name: 'Test User With Manager',
      manager_id: managerId,
    }),
  });
  
  const data = await res.json();
  
  const user = data.data?.user || data.data;
  
  if (res.ok && user?.id) {
    console.log(`✅ PASS: Created user ID ${user.id}`);
    console.log(`   Manager ID: ${user.manager_id}`);
    return user.id;
  } else {
    console.log('❌ FAIL:', data);
    return null;
  }
}

async function testUpdateUserManager(userId, newManagerId) {
  console.log(`\n📝 Test 3: PUT /users/${userId} (Update manager)`);
  
  const res = await fetch(`${API_BASE}/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      manager_id: newManagerId,
    }),
  });
  
  const data = await res.json();
  
  const user = data.data?.user || data.data;
  
  if (res.ok && user?.id) {
    console.log(`✅ PASS: Updated user manager`);
    console.log(`   New Manager ID: ${user.manager_id}`);
  } else {
    console.log('❌ FAIL:', data);
  }
  console.log('');
}

async function testGetUserWithManager(userId) {
  console.log(`📝 Test 4: GET /users/${userId} (Check manager relation)`);
  
  const res = await fetch(`${API_BASE}/users/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  const data = await res.json();
  
  const user = data.data?.user || data.data;
  
  if (res.ok && user?.id) {
    console.log(`✅ PASS: Got user - ${user.full_name}`);
    console.log(`   Manager ID: ${user.manager_id || 'None'}`);
    
    if (user.manager) {
      console.log(`   Manager Name: ${user.manager.full_name}`);
    }
  } else {
    console.log('❌ FAIL:', data);
  }
  console.log('');
}

async function testRemoveManager(userId) {
  console.log(`📝 Test 5: PUT /users/${userId} (Remove manager)`);
  
  const res = await fetch(`${API_BASE}/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      manager_id: null,
    }),
  });
  
  const data = await res.json();
  
  const user = data.data?.user || data.data;
  
  if (res.ok && user?.id) {
    console.log(`✅ PASS: Removed manager`);
    console.log(`   Manager ID: ${user.manager_id || 'None'}`);
  } else {
    console.log('❌ FAIL:', data);
  }
  console.log('');
}

async function testDeleteUser(userId) {
  console.log(`📝 Test 6: DELETE /users/${userId}`);
  
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
  console.log('');
}

async function main() {
  try {
    await login();
    
    await testGetUsers();
    
    const newUserId = await testCreateUserWithManager();
    
    if (newUserId) {
      await testGetUserWithManager(newUserId);
      
      // Get another user to use as new manager
      const usersRes = await fetch(`${API_BASE}/users`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const usersData = await usersRes.json();
      const users = usersData.data?.users || usersData.data || [];
      const newManagerId = users.find(u => u.id !== newUserId)?.id;
      
      if (newManagerId) {
        await testUpdateUserManager(newUserId, newManagerId);
      }
      
      await testRemoveManager(newUserId);
      await testDeleteUser(newUserId);
    }
    
    console.log('✅ All manager field tests completed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
