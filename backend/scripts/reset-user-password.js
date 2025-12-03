const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function resetPassword() {
  const email = process.argv[2];
  const newPassword = process.argv[3] || 'admin123';

  if (!email) {
    console.log('Usage: node reset-user-password.js <email> [password]');
    process.exit(1);
  }

  try {
    console.log(`🔄 Resetting password for: ${email}\n`);

    // Find user
    const user = await prisma.users.findFirst({
      where: { email },
      include: {
        tenant: true,
        user_roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }

    console.log('👤 User found:');
    console.log('   Name:', user.full_name);
    console.log('   Email:', user.email);
    console.log('   Tenant:', user.tenant?.name);
    console.log('   Roles:', user.user_roles.map(ur => ur.role?.name).join(', '));

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.users.update({
      where: { id: user.id },
      data: { password_hash: passwordHash }
    });

    console.log('\n✅ Password reset successfully!');
    console.log('\n📧 Login credentials:');
    console.log('   Email:', email);
    console.log('   Password:', newPassword);
    console.log('\n🔗 Login at: http://localhost:3000');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
