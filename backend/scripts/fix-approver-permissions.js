/**
 * Fix approver permissions - Add approvals:update permission
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPermissions() {
  console.log('🔧 Fixing approver permissions...\n');
  
  // 1. Find or create approvals:update permission
  console.log('📝 Finding/creating approvals:update permission...');
  let permission = await prisma.permissions.findUnique({
    where: {
      resource_action: {
        resource: 'approvals',
        action: 'update'
      }
    }
  });
  
  if (!permission) {
    permission = await prisma.permissions.create({
      data: {
        resource: 'approvals',
        action: 'update',
        description: 'Can update approval status (approve/reject/request info)'
      }
    });
    console.log('✅ Created permission: approvals:update');
  } else {
    console.log('✅ Permission exists: approvals:update');
  }
  
  // 2. Find Manager role
  console.log('\n👨‍💼 Finding Manager role...');
  const managerRole = await prisma.roles.findFirst({
    where: {
      name: 'Manager',
      tenant_id: 1
    }
  });
  
  if (!managerRole) {
    console.log('❌ Manager role not found');
    return;
  }
  console.log(`✅ Found Manager role (ID: ${managerRole.id})`);
  
  // 3. Check if permission already assigned
  const existing = await prisma.role_permissions.findUnique({
    where: {
      role_id_permission_id: {
        role_id: managerRole.id,
        permission_id: permission.id
      }
    }
  });
  
  if (existing) {
    console.log('✅ Permission already assigned to Manager role');
  } else {
    // 4. Assign permission to Manager role
    await prisma.role_permissions.create({
      data: {
        role_id: managerRole.id,
        permission_id: permission.id
      }
    });
    console.log('✅ Assigned approvals:update to Manager role');
  }
  
  // 5. Verify approver user has Manager role
  console.log('\n👤 Checking approver user...');
  const approver = await prisma.users.findUnique({
    where: { email: 'approver@acme.local' },
    include: {
      user_roles: {
        include: {
          role: true
        }
      }
    }
  });
  
  if (!approver) {
    console.log('❌ Approver user not found');
    return;
  }
  
  const hasManagerRole = approver.user_roles.some(ur => ur.role.name === 'Manager');
  if (hasManagerRole) {
    console.log('✅ Approver has Manager role');
  } else {
    console.log('⚠️  Approver does NOT have Manager role');
    console.log('   Assigning Manager role...');
    
    await prisma.user_roles.create({
      data: {
        user_id: approver.id,
        role_id: managerRole.id
      }
    });
    console.log('✅ Assigned Manager role to approver');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ PERMISSIONS FIXED!');
  console.log('='.repeat(60));
  console.log('Approver user now has:');
  console.log('  - Manager role');
  console.log('  - approvals:update permission');
  console.log('='.repeat(60));
}

fixPermissions()
  .then(() => {
    console.log('\n✅ Ready to run test again');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
