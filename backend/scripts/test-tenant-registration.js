const fetch = require('node-fetch');

const API_URL = 'http://localhost:4000/api/v1';

async function testTenantRegistration() {
  console.log('🧪 Testing Tenant Registration Feature\n');

  // Test 1: Register with new tenant
  console.log('📝 Test 1: Register user with new tenant');
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test.tenant.${Date.now()}@example.com`,
        password: 'TestPass123',
        full_name: 'Test Tenant User',
        company_name: 'Test Company Ltd',
        create_tenant: true,
        terms_accepted: true
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Registration successful');
      console.log('   User ID:', data.userId);
      console.log('   Tenant ID:', data.tenantId);
      console.log('   Message:', data.message);
    } else {
      console.log('❌ Registration failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n---\n');

  // Test 2: Register without new tenant (default tenant)
  console.log('📝 Test 2: Register user in default tenant');
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test.default.${Date.now()}@example.com`,
        password: 'TestPass123',
        full_name: 'Test Default User',
        create_tenant: false,
        terms_accepted: true
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Registration successful');
      console.log('   User ID:', data.userId);
      console.log('   Tenant ID:', data.tenantId);
      console.log('   Message:', data.message);
    } else {
      console.log('❌ Registration failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n---\n');

  // Test 3: Register with tenant but no company name (should fail)
  console.log('📝 Test 3: Register with tenant flag but no company name');
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test.invalid.${Date.now()}@example.com`,
        password: 'TestPass123',
        full_name: 'Test Invalid User',
        create_tenant: true,
        // company_name missing
        terms_accepted: true
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('⚠️  Registration succeeded (should have failed)');
    } else {
      console.log('✅ Registration correctly failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n✅ All tests completed!\n');
}

testTenantRegistration().catch(console.error);
