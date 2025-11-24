const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignApprovalPermissions() {
  console.log('🔧 Assigning approval permissions to Manager role...\n');

  try {
    const tenantId = 1;

    // 1. Get Manager role
    const managerRole = await prisma.roles.findFirst({
      where: { name: 'Manager', tenant_id: tenantId },
    });

    if (!managerRole) {
      console.log('❌ Manager role not found');
      return;
    }

    console.log('✅ Found Manager role:', managerRole.id);

    // 2. Get approval permissions
    const approvalPermissions = await prisma.permissions.findMany({
      where: {
        resource: 'approvals',
      },
    });

    console.log('✅ Found', approvalPermissions.length, 'approval permissions');

    // 3. Assign permissions to Manager role
    for (const permission of approvalPermissions) {
      const existing = await prisma.role_permissions.findFirst({
        where: {
          role_id: managerRole.id,
          permission_id: permission.id,
        },
      });

      if (existing) {
        console.log('   ⏭️  Already has:', permission.resource + ':' + permission.action);
      } else {
        await prisma.role_permissions.create({
          data: {
            role_id: managerRole.id,
            permission_id: permission.id,
          },
        });
        console.log('   ✅ Assigned:', permission.resource + ':' + permission.action);
      }
    }

    console.log('\n🎉 Done! Manager role now has approval permissions.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

assignApprovalPermissions();
