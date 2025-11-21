const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetLoginAttempts() {
  await prisma.users.updateMany({
    data: {
      login_attempts: 0,
      locked_until: null
    }
  });
  
  console.log('✅ All login attempts reset');
  await prisma.$disconnect();
}

resetLoginAttempts();
