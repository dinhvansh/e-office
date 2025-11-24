const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        full_name: true,
      },
      take: 10,
    });

    console.log('📋 Available users:');
    users.forEach(u => {
      console.log(`ID: ${u.id}, Email: ${u.email}, Name: ${u.full_name || 'No name'}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();