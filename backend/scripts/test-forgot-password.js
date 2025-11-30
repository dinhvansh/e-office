const axios = require('axios');

const API_URL = 'http://localhost:4000/api/v1';

async function testForgotPassword() {
  console.log('🧪 Testing Forgot Password Flow\n');

  try {
    // Test 1: Request password reset
    console.log('1️⃣ Requesting password reset for admin@acme.local...');
    const resetResponse = await axios.post(`${API_URL}/auth/forgot-password`, {
      email: 'admin@acme.local'
    });
    console.log('✅ Reset request successful:', resetResponse.data);

    // Test 2: Request with non-existent email (should still return success for security)
    console.log('\n2️⃣ Testing with non-existent email...');
    const nonExistentResponse = await axios.post(`${API_URL}/auth/forgot-password`, {
      email: 'nonexistent@example.com'
    });
    console.log('✅ Response:', nonExistentResponse.data);

    // Test 3: Rate limiting (try 4 times quickly)
    console.log('\n3️⃣ Testing rate limiting (should fail on 4th attempt)...');
    for (let i = 1; i <= 4; i++) {
      try {
        await axios.post(`${API_URL}/auth/forgot-password`, {
          email: 'admin@acme.local'
        });
        console.log(`   Attempt ${i}: Success`);
      } catch (error) {
        console.log(`   Attempt ${i}: Failed - ${error.response?.data?.error || error.message}`);
      }
    }

    console.log('\n✅ All tests completed!');
    console.log('\n📧 Check your email for the reset link');
    console.log('💡 To get the token, check the database:');
    console.log('   SELECT token, expires_at FROM password_reset_tokens ORDER BY created_at DESC LIMIT 1;');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testForgotPassword();
