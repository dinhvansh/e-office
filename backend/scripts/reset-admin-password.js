const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function resetPassword() {
  try {
    console.log('🔄 Resetting admin password...\n');

    const email = 'admin@acme.local';
    const newPassword = 'password123';

    // Hash password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user
    const user = await prisma.users.update({
      where: { email },
      data: { password_hash: hashedPassword },
    });

    console.log('✅ Password reset successfully!');
    console.log('\n📧 Login credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}`);
    console.log('\n🔗 Login at: http://localhost:3000');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
