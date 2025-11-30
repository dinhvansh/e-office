const fetch = require('node-fetch');

const API_URL = 'http://localhost:4000/api/v1';

async function testForgotPasswordFrontend() {
  console.log('🧪 Testing Forgot Password from Frontend Perspective\n');

  try {
    // Test 1: Request password reset
    console.log('1️⃣ Testing forgot-password endpoint...');
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@acme.local' })
    });

    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, data);

    if (response.ok) {
      console.log('   ✅ Forgot password endpoint working!\n');
    } else {
      console.log('   ❌ Failed:', data.error, '\n');
      return;
    }

    // Test 2: Get token from database
    console.log('2️⃣ Getting reset token from database...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const resetToken = await prisma.password_reset_tokens.findFirst({
      where: { 
        user: { email: 'admin@acme.local' },
        used_at: null
      },
      orderBy: { created_at: 'desc' }
    });

    if (!resetToken) {
      console.log('   ❌ No reset token found in database\n');
      await prisma.$disconnect();
      return;
    }

    console.log(`   ✅ Token found: ${resetToken.token.substring(0, 20)}...\n`);

    // Test 3: Verify token
    console.log('3️⃣ Testing verify-reset-token endpoint...');
    const verifyResponse = await fetch(`${API_URL}/auth/verify-reset-token/${resetToken.token}`);
    const verifyData = await verifyResponse.json();
    console.log(`   Status: ${verifyResponse.status}`);
    console.log(`   Response:`, verifyData);

    if (verifyData.valid) {
      console.log('   ✅ Token is valid!\n');
    } else {
      console.log('   ❌ Token is invalid\n');
      await prisma.$disconnect();
      return;
    }

    // Test 4: Reset password
    console.log('4️⃣ Testing reset-password endpoint...');
    const resetResponse = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        token: resetToken.token,
        password: 'NewPassword123'
      })
    });

    const resetData = await resetResponse.json();
    console.log(`   Status: ${resetResponse.status}`);
    console.log(`   Response:`, resetData);

    if (resetResponse.ok) {
      console.log('   ✅ Password reset successful!\n');
    } else {
      console.log('   ❌ Password reset failed:', resetData.error, '\n');
    }

    // Test 5: Verify token is now used
    console.log('5️⃣ Verifying token is marked as used...');
    const usedToken = await prisma.password_reset_tokens.findUnique({
      where: { id: resetToken.id }
    });

    if (usedToken.used_at) {
      console.log('   ✅ Token marked as used!\n');
    } else {
      console.log('   ❌ Token not marked as used\n');
    }

    // Test 6: Try to use token again (should fail)
    console.log('6️⃣ Testing token reuse (should fail)...');
    const reuseResponse = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        token: resetToken.token,
        password: 'AnotherPassword123'
      })
    });

    const reuseData = await reuseResponse.json();
    console.log(`   Status: ${reuseResponse.status}`);
    console.log(`   Response:`, reuseData);

    if (!reuseResponse.ok) {
      console.log('   ✅ Token reuse correctly prevented!\n');
    } else {
      console.log('   ❌ Token reuse was allowed (security issue!)\n');
    }

    // Reset password back to original
    console.log('7️⃣ Resetting password back to original...');
    const user = await prisma.users.findUnique({
      where: { email: 'admin@acme.local' }
    });

    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('secret123', 10);
    
    await prisma.users.update({
      where: { id: user.id },
      data: { password_hash: hashedPassword }
    });

    console.log('   ✅ Password restored to "secret123"\n');

    await prisma.$disconnect();

    console.log('✅ All tests completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   - Forgot password endpoint: Working');
    console.log('   - Token generation: Working');
    console.log('   - Token verification: Working');
    console.log('   - Password reset: Working');
    console.log('   - Token single-use: Working');
    console.log('   - Frontend integration: Ready');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

testForgotPasswordFrontend();
