/**
 * Add approvals:update permission to Manager role
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔐 Adding approvals:update Permission to Manager Role\n');
  
  // Get Manager role
  const managerRole = await prisma.roles.findFirst({
    where: { name: 'Manager' }
  });
  
  if (!managerRole) {
    console.error('❌ Manager role not found');
    return;
  }
  
  console.log(`Role: ${managerRole.name} (ID: ${managerRole.id})\n`);
  
  // Get or create approvals:update permission
  let permission = await prisma.permissions.findFirst({
    where: {
      resource: 'approvals',
      action: 'update'
    }
  });
  
  if (!permission) {
    permission = await prisma.permissions.create({
      data: {
        resource: 'approvals',
        action: 'update',
        description: 'Update/approve approvals'
      }
    });
    console.log(`✓ Created permission: approvals:update`);
  } else {
    console.log(`  Permission exists: approvals:update`);
  }
  
  // Check if role already has this permission
  const existing = await prisma.role_permissions.findFirst({
    where: {
      role_id: managerRole.id,
      permission_id: permission.id
    }
  });
  
  if (!existing) {
    await prisma.role_permissions.create({
      data: {
        role_id: managerRole.id,
        permission_id: permission.id
      }
    });
    console.log(`✓ Granted approvals:update to Manager role`);
  } else {
    console.log(`  Already granted to Manager`);
  }
  
  console.log('\n✅ Permission granted successfully!');
  
  // Show all approval permissions for Manager
  console.log('\n📊 Manager Role - All Approval Permissions:');
  const allPerms = await prisma.role_permissions.findMany({
    where: {
      role_id: managerRole.id,
      permission: {
        resource: 'approvals'
      }
    },
    include: {
      permission: true
    }
  });
  
  allPerms.forEach(rp => {
    console.log(`  ✓ ${rp.permission.resource}:${rp.permission.action}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
