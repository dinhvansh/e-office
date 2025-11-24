const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addApprovalsUpdatePermission() {
  console.log('🔧 Adding approvals:update permission\n');

  try {
    // Check if permission exists
    let updatePermission = await prisma.permissions.findFirst({
      where: {
        resource: 'approvals',
        action: 'update'
      }
    });

    if (!updatePermission) {
      console.log('📋 Creating approvals:update permission...');
      updatePermission = await prisma.permissions.create({
        data: {
          resource: 'approvals',
          action: 'update',
          description: 'Update approval status'
        }
      });
      console.log('✅ Permission created');
    } else {
      console.log('✅ Permission already exists');
    }

    console.log('   ID:', updatePermission.id);
    console.log('   Resource:', updatePermission.resource);
    console.log('   Action:', updatePermission.action);
    console.log('');

    // Get Manager role
    const managerRole = await prisma.roles.findFirst({
      where: { name: 'Manager' }
    });

    if (!managerRole) {
      console.log('❌ Manager role not found');
      return;
    }

    // Assign to Manager role
    const existing = await prisma.role_permissions.findUnique({
      where: {
        role_id_permission_id: {
          role_id: managerRole.id,
          permission_id: updatePermission.id
        }
      }
    });

    if (!existing) {
      await prisma.role_permissions.create({
        data: {
          role_id: managerRole.id,
          permission_id: updatePermission.id
        }
      });
      console.log('✅ Permission assigned to Manager role');
    } else {
      console.log('✅ Manager role already has this permission');
    }

    // Also assign to Admin role
    const adminRole = await prisma.roles.findFirst({
      where: { name: 'Admin' }
    });

    if (adminRole) {
      const adminHas = await prisma.role_permissions.findUnique({
        where: {
          role_id_permission_id: {
            role_id: adminRole.id,
            permission_id: updatePermission.id
          }
        }
      });

      if (!adminHas) {
        await prisma.role_permissions.create({
          data: {
            role_id: adminRole.id,
            permission_id: updatePermission.id
          }
        });
        console.log('✅ Permission assigned to Admin role');
      }
    }

    console.log('\n✅ Done! Logout and login again to get new permissions.');

    await prisma.$disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

addApprovalsUpdatePermission();
