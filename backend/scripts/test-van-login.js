const axios = require('axios');

const API_URL = 'http://localhost:4000/api/v1';

async function testVanLogin() {
  console.log('🔐 Testing Van login...\n');
  
  try {
    // Login
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'vanqn95@gmail.com',
      password: 'admin123'
    });
    
    console.log('✅ Login successful!');
    console.log('📧 Email:', loginRes.data.data.user.email);
    console.log('🎭 Role:', loginRes.data.data.user.role);
    console.log('🏢 Tenant:', loginRes.data.data.tenant.name);
    console.log('\n📋 Full user data:', JSON.stringify(loginRes.data.data.user, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testVanLogin();
