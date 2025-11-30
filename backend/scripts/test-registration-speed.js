const fetch = require('node-fetch');

const API_URL = 'http://localhost:4000/api/v1';

async function testRegistrationSpeed() {
  console.log('⚡ Testing Registration Speed\n');

  const testEmail = `speedtest${Date.now()}@test.com`;
  const startTime = Date.now();

  try {
    console.log('📝 Registering user...');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Start time: ${new Date().toISOString()}\n`);

    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'TestPassword123',
        full_name: 'Speed Test User',
        terms_accepted: true
      })
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    const data = await response.json();

    console.log(`✅ Registration completed!`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
    console.log(`   Response:`, data);

    if (duration < 1000) {
      console.log('\n🚀 FAST! Registration completed in under 1 second');
    } else if (duration < 3000) {
      console.log('\n✅ GOOD! Registration completed in under 3 seconds');
    } else {
      console.log('\n⚠️ SLOW! Registration took more than 3 seconds');
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test user...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    await prisma.users.deleteMany({
      where: { email: testEmail }
    });
    
    await prisma.$disconnect();
    console.log('✅ Cleanup complete');

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.error(`❌ Test failed after ${duration}ms:`, error.message);
  }
}

testRegistrationSpeed();
