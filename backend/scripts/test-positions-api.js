/**
 * Test Positions API
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
  console.log('📝 Test 1: GET /positions');
  
  const res = await fetch(`${API_BASE}/positions`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  const data = await res.json();
  
  if (res.ok && data.data?.positions) {
    console.log(`✅ PASS: Got ${data.data.positions.length} positions`);
    console.log(`   Sample: ${data.data.positions[0]?.name} (${data.data.positions[0]?.code})`);
  } else {
    console.log('❌ FAIL:', data);
  }
  console.log('');
}

async function testGetStats() {
  console.log('📝 Test 2: GET /positions/stats');
  
  const res = await fetch(`${API_BASE}/positions/stats`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  const data = await res.json();
  
  if (res.ok && data.data) {
    console.log(`✅ PASS: Stats - Total: ${data.data.total}, Active: ${data.data.active}`);
  } else {
    console.log('❌ FAIL:', data);
  }
  console.log('');
}

async function testCreatePosition() {
  console.log('📝 Test 3: POST /positions (Create)');
  
  const res = await fetch(`${API_BASE}/positions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      code: 'TEST_POS',
      name: 'Test Position',
      description: 'For testing only',
      level: 99,
    }),
  });
  
  const data = await res.json();
  
  if (res.ok && data.data?.position) {
    console.log(`✅ PASS: Created position ID ${data.data.position.id}`);
    return data.data.position.id;
  } else {
    console.log('❌ FAIL:', data);
    return null;
  }
}

async function testUpdatePosition(id) {
  console.log(`\n📝 Test 4: PUT /positions/${id} (Update)`);
  
  const res = await fetch(`${API_BASE}/positions/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'Test Position Updated',
      level: 100,
    }),
  });
  
  const data = await res.json();
  
  if (res.ok && data.data?.position) {
    console.log(`✅ PASS: Updated position - ${data.data.position.name}`);
  } else {
    console.log('❌ FAIL:', data);
  }
  console.log('');
}

async function testDeletePosition(id) {
  console.log(`📝 Test 5: DELETE /positions/${id}`);
  
  const res = await fetch(`${API_BASE}/positions/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  const data = await res.json();
  
  if (res.ok && data.data?.deleted) {
    console.log(`✅ PASS: Deleted position ID ${id}`);
  } else {
    console.log('❌ FAIL:', data);
  }
  console.log('');
}

async function testGetPositionById() {
  console.log('📝 Test 6: GET /positions/:id');
  
  // Get first position
  const listRes = await fetch(`${API_BASE}/positions`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const listData = await listRes.json();
  const firstId = listData.data.positions[0]?.id;
  
  if (!firstId) {
    console.log('❌ FAIL: No positions found');
    return;
  }
  
  const res = await fetch(`${API_BASE}/positions/${firstId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  const data = await res.json();
  
  if (res.ok && data.data?.position) {
    console.log(`✅ PASS: Got position - ${data.data.position.name}`);
    console.log(`   Users count: ${data.data.position._count?.users || 0}`);
  } else {
    console.log('❌ FAIL:', data);
  }
  console.log('');
}

async function main() {
  try {
    await login();
    
    await testGetPositions();
    await testGetStats();
    await testGetPositionById();
    
    const newId = await testCreatePosition();
    if (newId) {
      await testUpdatePosition(newId);
      await testDeletePosition(newId);
    }
    
    console.log('✅ All tests completed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
