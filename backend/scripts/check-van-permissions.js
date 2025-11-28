const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.users.findUnique({
    where: { id: 6 },
    include: {
      user_roles: {
        include: {
          role: {
            include: {
              role_permissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      }
    }
  });

  console.log('👤 User:', user.email);
  console.log('📋 Roles:', user.user_roles.map(ur => ur.role.name).join(', '));
  
  const allPerms = user.user_roles.flatMap(ur => 
    ur.role.role_permissions.map(rp => rp.permission.name)
  );
  
  console.log('\n🔑 Permissions:');
  allPerms.forEach(p => console.log(`   - ${p}`));
  
  // Check for my-tasks permission
  const hasMyTasks = allPerms.includes('my-tasks.view');
  console.log(`\n${hasMyTasks ? '✅' : '❌'} Has my-tasks.view permission: ${hasMyTasks}`);
  
  await prisma.$disconnect();
}

main();
