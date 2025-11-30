const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearRateLimits() {
  console.log('🧹 Clearing rate limit tokens...\n');

  try {
    // Delete all password reset tokens
    const deleted = await prisma.password_reset_tokens.deleteMany({});
    console.log(`✅ Deleted ${deleted.count} password reset tokens`);

    await prisma.$disconnect();
    console.log('\n✅ Rate limits cleared!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
  }
}

clearRateLimits();
