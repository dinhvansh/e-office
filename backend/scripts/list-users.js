const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listUsers() {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        tenant: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log('\n📋 Users in database:\n');
    users.forEach(user => {
      console.log(`ID: ${user.id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role || 'N/A'}`);
      console.log(`Status: ${user.status}`);
      console.log(`Tenant: ${user.tenant?.name || 'N/A'}`);
      console.log('---');
    });

    console.log(`\nTotal: ${users.length} users\n`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
