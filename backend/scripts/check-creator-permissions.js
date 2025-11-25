const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCreatorPermissions() {
  try {
    const user = await prisma.users.findUnique({
      where: { email: 'creator@acme.local' },
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
      console.log('❌ User not found');
      return;
    }

    console.log('👤 User:', user.email);
    console.log('   ID:', user.id);
    console.log('   Roles:', user.user_roles.length);
    console.log('');

    for (const ur of user.user_roles) {
      console.log(`📋 Role: ${ur.role.name} (ID: ${ur.role.id})`);
      console.log(`   Permissions: ${ur.role.role_permissions.length}`);
      
      const workflowPerms = ur.role.role_permissions.filter(rp => 
        rp.permission.resource === 'workflows'
      );
      
      if (workflowPerms.length > 0) {
        console.log('   Workflows permissions:');
        workflowPerms.forEach(rp => {
          console.log(`     ✅ workflows:${rp.permission.action}`);
        });
      } else {
        console.log('   ❌ NO workflows permissions!');
      }
      console.log('');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCreatorPermissions();
