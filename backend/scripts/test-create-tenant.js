/**
 * Test script for creating new tenant with admin
 * This demonstrates the SaaS onboarding flow
 */

const axios = require('axios');

const API_URL = 'http://localhost:4000/api/v1';

async function createTenant() {
  console.log('🚀 Creating new tenant with admin...\n');

  try {
    const response = await axios.post(`${API_URL}/tenants/create-with-admin`, {
      // Tenant info
      tenant_name: 'Acme Corporation',
      tenant_domain: 'acme.com',
      
      // Admin user info
      admin_email: 'admin@acme.com',
      admin_password: 'Admin@123',
      admin_full_name: 'John Doe'
    });

    console.log('✅ Tenant created successfully!\n');
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
    const { tenant, admin } = response.data.data;
    
    console.log('\n🎉 SUCCESS! You can now login with:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: Admin@123`);
    console.log(`   Tenant ID: ${tenant.id}`);
    console.log(`   Tenant Name: ${tenant.name}`);

  } catch (error) {
    console.error('❌ Error creating tenant:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

// Run the test
createTenant();
