/**
 * Grant approval permissions to Manager role
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔐 Granting Approval Permissions to Manager Role\n');
  
  // Get Manager role
  const managerRole = await prisma.roles.findFirst({
    where: { name: 'Manager' },
    include: {
      role_permissions: {
        include: {
          permission: true
        }
      }
    }
  });
  
  if (!managerRole) {
    console.error('❌ Manager role not found');
    return;
  }
  
  console.log(`Role: ${managerRole.name} (ID: ${managerRole.id})\n`);
  
  // Get or create approval permissions
  const approvalPermissions = [
    { resource: 'approvals', action: 'read', description: 'View approvals' },
    { resource: 'approvals', action: 'approve', description: 'Approve documents' },
    { resource: 'approvals', action: 'reject', description: 'Reject documents' },
  ];
  
  console.log('📋 Granting approval permissions...\n');
  
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
    
    // Check if role already has this permission
    const hasPermission = managerRole.role_permissions.some(
      rp => rp.permission_id === permission.id
    );
    
    if (!hasPermission) {
      await prisma.role_permissions.create({
        data: {
          role_id: managerRole.id,
          permission_id: permission.id
        }
      });
      console.log(`  ✓ Granted to Manager role`);
    } else {
      console.log(`    Already granted to Manager`);
    }
  }
  
  console.log('\n✅ Approval permissions granted successfully!');
  
  // Show summary
  console.log('\n📊 Manager Role Permissions:');
  const updatedRole = await prisma.roles.findUnique({
    where: { id: managerRole.id },
    include: {
      role_permissions: {
        include: {
          permission: true
        }
      }
    }
  });
  
  const approvalPerms = updatedRole.role_permissions.filter(
    rp => rp.permission.resource === 'approvals'
  );
  
  console.log(`  Total approval permissions: ${approvalPerms.length}`);
  approvalPerms.forEach(rp => {
    console.log(`    - ${rp.permission.resource}:${rp.permission.action}`);
  });
  
  // Check users with Manager role
  console.log('\n👥 Users with Manager role:');
  const managers = await prisma.user_roles.findMany({
    where: { role_id: managerRole.id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          full_name: true
        }
      }
    }
  });
  
  console.log(`  Total: ${managers.length}`);
  managers.forEach(ur => {
    console.log(`    - ${ur.user.full_name || ur.user.email} (${ur.user.email})`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
