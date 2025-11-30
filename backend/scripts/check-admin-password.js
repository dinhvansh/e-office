const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    const user = await prisma.users.findUnique({
      where: { email: 'admin@acme.local' }
    });

    if (!user) {
      console.log('❌ Admin user not found!');
      return;
    }

    console.log('✅ Admin user found:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Full Name:', user.full_name);
    console.log('   Password Hash:', user.password_hash.substring(0, 20) + '...');
    
    // Test password
    const testPassword = 'password123';
    const isMatch = await bcrypt.compare(testPassword, user.password_hash);
    
    console.log('\n🔐 Password Test:');
    console.log('   Testing password:', testPassword);
    console.log('   Match:', isMatch ? '✅ YES' : '❌ NO');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
