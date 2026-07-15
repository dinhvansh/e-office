const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function unlockAdmin() {
  try {
    console.log('🔓 Unlocking admin account...\n');

    const email = 'admin@acme.local';

    // Update user - set status to active and clear any lock fields
    const user = await prisma.users.update({
      where: { email },
      data: { 
        status: 'active',
        // Add any other lock-related fields here if they exist
      },
    });

    console.log('✅ Admin account unlocked!');
    console.log('\n📧 You can now login with:');
    console.log(`   Email: ${email}`);
    console.log('   Password: supplied through DEMO_ADMIN_PASSWORD');
    console.log('\n🔗 Login at: http://localhost:3000');
    console.log('\n💡 Tip: Clear browser cache or use incognito mode');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

unlockAdmin();
