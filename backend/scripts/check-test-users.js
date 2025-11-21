const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  const users = await prisma.users.findMany({
    where: {
      email: {
        in: ['user1@acme.local', 'viewer1@acme.local']
      }
    },
    select: {
      id: true,
      email: true,
      full_name: true,
      department_id: true,
      department: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
  
  console.log('Test Users:');
  users.forEach(u => {
    console.log(`  - ID: ${u.id}, Email: ${u.email}, Dept: ${u.department?.name || 'None'} (ID: ${u.department_id || 'null'})`);
  });
  
  await prisma.$disconnect();
}

checkUsers();
