/**
 * Check user permissions
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.users.findFirst({
    where: { email: 'admin@acme.local' },
    include: {
      user_roles: {
        include: {
          role: {
            include: {
              role_permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    console.log('❌ User not found');
    return;
  }

  console.log('👤 User:', user.email);
  console.log('📋 Roles:', user.user_roles.length);

  for (const ur of user.user_roles) {
    console.log(`\n🎭 Role: ${ur.role.name}`);
    console.log(`   Permissions: ${ur.role.role_permissions.length}`);
    
    const positionsPerms = ur.role.role_permissions.filter(
      rp => rp.permission.resource === 'positions'
    );
    
    console.log(`   Positions permissions: ${positionsPerms.length}`);
    positionsPerms.forEach(rp => {
      console.log(`   - ${rp.permission.resource}:${rp.permission.action}`);
    });
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
