const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('password123', 10);
  await prisma.users.update({
    where: { email: 'vanqn95@gamil.com' },
    data: { password_hash: hash }
  });
  console.log('✅ Password reset for vanqn95@gamil.com');
  console.log('   Password: password123');
  await prisma.$disconnect();
}

main();
