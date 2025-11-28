const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Granting permissions to Van NGUYEN...\n');

  const userId = 6;
  const tenantId = 1;

  // Get or create "Approver" role
  let approverRole = await prisma.roles.findFirst({
    where: {
      tenant_id: tenantId,
      name: 'Approver'
    }
  });

  if (!approverRole) {
    console.log('📋 Creating Approver role...');
    approverRole = await prisma.roles.create({
      data: {
        tenant_id: tenantId,
        name: 'Approver',
        description: 'Can approve documents and view tasks'
      }
    });
    console.log(`   ✓ Created role: ${approverRole.name}`);
  } else {
    console.log(`📋 Found existing role: ${approverRole.name}`);
  }

  // Get required permissions (resource.action format)
  const requiredPermissions = [
    { resource: 'approvals', action: 'read' },
    { resource: 'approvals', action: 'update' }, // ✅ Needed to approve/reject
    { resource: 'approvals', action: 'approve' },
    { resource: 'approvals', action: 'reject' },
    { resource: 'documents', action: 'read' },
    { resource: 'sign_requests', action: 'read' }
  ];

  console.log('\n🔑 Granting permissions to Approver role...');
  for (const perm of requiredPermissions) {
    const permission = await prisma.permissions.findFirst({
      where: { 
        resource: perm.resource,
        action: perm.action
      }
    });

    if (permission) {
      // Check if already has permission
      const existing = await prisma.role_permissions.findFirst({
        where: {
          role_id: approverRole.id,
          permission_id: permission.id
        }
      });

      if (!existing) {
        await prisma.role_permissions.create({
          data: {
            role_id: approverRole.id,
            permission_id: permission.id
          }
        });
        console.log(`   ✓ Granted: ${perm.resource}.${perm.action}`);
      } else {
        console.log(`   ⏭️  Already has: ${perm.resource}.${perm.action}`);
      }
    } else {
      console.log(`   ⚠️  Permission not found: ${perm.resource}.${perm.action}`);
    }
  }

  // Assign Approver role to Van
  console.log('\n👤 Assigning Approver role to Van...');
  const existingUserRole = await prisma.user_roles.findFirst({
    where: {
      user_id: userId,
      role_id: approverRole.id
    }
  });

  if (!existingUserRole) {
    await prisma.user_roles.create({
      data: {
        user_id: userId,
        role_id: approverRole.id
      }
    });
    console.log('   ✓ Assigned Approver role');
  } else {
    console.log('   ⏭️  Already has Approver role');
  }

  // Verify
  console.log('\n✅ Verification:');
  const user = await prisma.users.findUnique({
    where: { id: userId },
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

  console.log(`   User: ${user.email}`);
  console.log(`   Roles: ${user.user_roles.map(ur => ur.role.name).join(', ')}`);
  
  const allPerms = user.user_roles.flatMap(ur => 
    ur.role.role_permissions.map(rp => `${rp.permission.resource}.${rp.permission.action}`)
  );
  
  const hasApprovalsRead = allPerms.includes('approvals.read');
  const hasSignRequestsRead = allPerms.includes('sign_requests.read');
  console.log(`   Has approvals.read: ${hasApprovalsRead ? '✅' : '❌'}`);
  console.log(`   Has sign_requests.read: ${hasSignRequestsRead ? '✅' : '❌'}`);

  await prisma.$disconnect();
}

main();
