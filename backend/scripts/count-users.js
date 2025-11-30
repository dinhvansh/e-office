const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function countUsers() {
  try {
    const users = await prisma.users.findMany({
      where: { tenant_id: 1 },
      select: {
        id: true,
        email: true,
        full_name: true,
        status: true,
        role: true
      }
    });

    console.log(`\n📊 Total users: ${users.length}\n`);
    
    users.forEach(user => {
      console.log(`  - [${user.id}] ${user.email} (${user.full_name || 'N/A'}) - ${user.status} - ${user.role}`);
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

countUsers();
