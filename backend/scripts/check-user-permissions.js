/**
 * Check user permissions
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUserPermissions(email) {
  try {
    console.log(`🔍 Checking permissions for: ${email}\n`);

    const user = await prisma.users.findUnique({
      where: { email },
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

    console.log('👤 User:', user.full_name || user.email);
    console.log('📧 Email:', user.email);
    console.log('🆔 ID:', user.id);
    console.log('🏢 Tenant ID:', user.tenant_id);
    console.log('\n📋 Roles:');

    for (const userRole of user.user_roles) {
      const role = userRole.role;
      console.log(`\n   🎭 ${role.name} (ID: ${role.id})`);
      console.log(`   Permissions: ${role.role_permissions.length}`);
      
      if (role.role_permissions.length > 0) {
        console.log('   List:');
        role.role_permissions.forEach(rp => {
          console.log(`     - ${rp.permission.resource}:${rp.permission.action}`);
        });
      }
    }

    // Check workflows permissions specifically
    console.log('\n🔍 Workflows permissions:');
    let hasWorkflowsRead = false;
    
    for (const userRole of user.user_roles) {
      const workflowPerms = userRole.role.role_permissions.filter(rp => 
        rp.permission.resource === 'workflows'
      );
      
      if (workflowPerms.length > 0) {
        workflowPerms.forEach(rp => {
          console.log(`   ✅ workflows:${rp.permission.action} (from ${userRole.role.name})`);
          if (rp.permission.action === 'read') {
            hasWorkflowsRead = true;
          }
        });
      }
    }

    if (!hasWorkflowsRead) {
      console.log('   ❌ NO workflows:read permission!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2] || 'approver@acme.local';
checkUserPermissions(email);
