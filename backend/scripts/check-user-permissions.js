const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserPermissions() {
  const user = await prisma.user.findFirst({
    where: { email: 'admin@acme.com' },
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

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log('User:', user.email);
  console.log('\nRoles:');
  user.user_roles.forEach(ur => {
    console.log(`- ${ur.role.name}`);
    console.log('  Permissions:');
    ur.role.role_permissions.forEach(rp => {
      console.log(`    - ${rp.permission.resource}:${rp.permission.action}`);
    });
  });

  await prisma.$disconnect();
}

checkUserPermissions().catch(console.error);
