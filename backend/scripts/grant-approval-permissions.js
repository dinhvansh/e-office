/**
 * Grant approval permissions to admin@acme.local
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔐 Granting Approval Permissions\n');
  
  // Get admin user
  const admin = await prisma.users.findUnique({
    where: { email: 'admin@acme.local' },
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
  
  if (!admin) {
    console.error('❌ User admin@acme.local not found');
    return;
  }
  
  console.log(`User: ${admin.email} (ID: ${admin.id})`);
  console.log(`Roles: ${admin.user_roles.map(ur => ur.role.name).join(', ')}\n`);
  
  // Get or create approval permissions
  const approvalPermissions = [
    { resource: 'approvals', action: 'read', description: 'View approvals' },
    { resource: 'approvals', action: 'create', description: 'Create approvals' },
    { resource: 'approvals', action: 'update', description: 'Update/approve approvals' },
    { resource: 'approvals', action: 'delete', description: 'Delete approvals' },
  ];
  
  console.log('📋 Checking approval permissions...\n');
  
  for (const perm of approvalPermissions) {
    // Check if permission exists
    let permission = await prisma.permissions.findFirst({
      where: {
        resource: perm.resource,
        action: perm.action
      }
    });
    
    // Create if not exists
    if (!permission) {
      permission = await prisma.permissions.create({
        data: {
          resource: perm.resource,
          action: perm.action,
          description: perm.description
        }
      });
      console.log(`✓ Created permission: ${perm.resource}:${perm.action}`);
    } else {
      console.log(`  Permission exists: ${perm.resource}:${perm.action}`);
    }
    
    // Grant to all admin roles
    for (const userRole of admin.user_roles) {
      const role = userRole.role;
      
      // Check if role already has this permission
      const hasPermission = role.role_permissions.some(
        rp => rp.permission_id === permission.id
      );
      
      if (!hasPermission) {
        await prisma.role_permissions.create({
          data: {
            role_id: role.id,
            permission_id: permission.id
          }
        });
        console.log(`  ✓ Granted to role: ${role.name}`);
      } else {
        console.log(`    Already granted to: ${role.name}`);
      }
    }
  }
  
  console.log('\n✅ Approval permissions granted successfully!');
  
  // Show summary
  console.log('\n📊 Summary:');
  const updatedAdmin = await prisma.users.findUnique({
    where: { email: 'admin@acme.local' },
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
  
  updatedAdmin.user_roles.forEach(ur => {
    console.log(`\nRole: ${ur.role.name}`);
    const approvalPerms = ur.role.role_permissions.filter(
      rp => rp.permission.resource === 'approvals'
    );
    console.log(`  Approval permissions: ${approvalPerms.length}`);
    approvalPerms.forEach(rp => {
      console.log(`    - ${rp.permission.resource}:${rp.permission.action}`);
    });
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
