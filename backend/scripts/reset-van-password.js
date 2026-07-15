const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const password = process.env.DEMO_ADMIN_PASSWORD;
  if (!password) throw new Error('DEMO_ADMIN_PASSWORD is required');
  const hash = await bcrypt.hash(password, 10);
  await prisma.users.update({
    where: { email: 'vanqn95@gamil.com' },
    data: { password_hash: hash }
  });
  console.log('✅ Password reset for vanqn95@gamil.com');
  console.log('   Password: supplied through DEMO_ADMIN_PASSWORD');
  await prisma.$disconnect();
}

main();
