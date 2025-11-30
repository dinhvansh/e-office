const axios = require('axios');

const API_URL = 'http://localhost:4000/api/v1';

async function testRegistration() {
  console.log('🧪 Testing Self Registration Flow\n');

  try {
    // Test 1: Register new user
    console.log('1️⃣ Registering new user...');
    const registerResponse = await axios.post(`${API_URL}/auth/register`, {
      email: 'newuser@example.com',
      password: 'Test123456',
      full_name: 'Nguyễn Văn Test',
      terms_accepted: true
    });
    console.log('✅ Registration successful:', registerResponse.data);
    const userId = registerResponse.data.userId;

    // Test 2: Try to login with pending account (should fail)
    console.log('\n2️⃣ Trying to login with pending account...');
    try {
      await axios.post(`${API_URL}/auth/login`, {
        email: 'newuser@example.com',
        password: 'Test123456'
      });
      console.log('❌ Should not be able to login with pending account');
    } catch (error) {
      console.log('✅ Login blocked for pending account:', error.response?.data?.error);
    }

    // Test 3: Get pending users (requires admin token)
    console.log('\n3️⃣ Getting pending users...');
    console.log('💡 Use admin token to call: GET /users/pending');

    // Test 4: Duplicate email
    console.log('\n4️⃣ Testing duplicate email registration...');
    try {
      await axios.post(`${API_URL}/auth/register`, {
        email: 'newuser@example.com',
        password: 'Test123456',
        full_name: 'Another User',
        terms_accepted: true
      });
      console.log('❌ Should not allow duplicate email');
    } catch (error) {
      console.log('✅ Duplicate email blocked:', error.response?.data?.error);
    }

    // Test 5: Weak password
    console.log('\n5️⃣ Testing weak password...');
    try {
      await axios.post(`${API_URL}/auth/register`, {
        email: 'another@example.com',
        password: 'weak',
        full_name: 'Test User',
        terms_accepted: true
      });
      console.log('❌ Should not allow weak password');
    } catch (error) {
      console.log('✅ Weak password blocked:', error.response?.data?.error);
    }

    console.log('\n✅ All tests completed!');
    console.log('\n📧 Check your email for registration confirmation');
    console.log('\n💡 To approve/reject users:');
    console.log('   - Login as admin');
    console.log('   - Go to Users page');
    console.log('   - Filter by "Chờ duyệt"');
    console.log('   - Click Approve or Reject buttons');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testRegistration();
