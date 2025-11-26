const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addApprovalsUpdateToAdmin() {
  try {
    console.log('🔍 Checking Admin role and approvals:update permission...\n');

    // Find Admin role
    const adminRole = await prisma.roles.findFirst({
      where: { name: 'Admin' }
    });

    if (!adminRole) {
      console.log('❌ Admin role not found!');
      return;
    }

    console.log(`✅ Found Admin role (ID: ${adminRole.id})`);

    // Find approvals:update permission
    const permission = await prisma.permissions.findFirst({
      where: { 
        resource: 'approvals',
        action: 'update'
      }
    });

    if (!permission) {
      console.log('❌ approvals:update permission not found!');
      return;
    }

    console.log(`✅ Found approvals:update permission (ID: ${permission.id})`);

    // Check if already assigned
    const existing = await prisma.role_permissions.findFirst({
      where: {
        role_id: adminRole.id,
        permission_id: permission.id
      }
    });

    if (existing) {
      console.log('✅ Permission already assigned to Admin role!');
      return;
    }

    // Assign permission
    await prisma.role_permissions.create({
      data: {
        role_id: adminRole.id,
        permission_id: permission.id
      }
    });

    console.log('✅ Successfully added approvals:update permission to Admin role!');

    // Verify
    const allAdminPermissions = await prisma.role_permissions.findMany({
      where: { role_id: adminRole.id },
      include: { permission: true }
    });

    const approvalPermissions = allAdminPermissions.filter(rp => 
      rp.permission.resource === 'approvals'
    );

    console.log('\n📋 Admin role approval permissions:');
    approvalPermissions.forEach(rp => {
      console.log(`  - ${rp.permission.resource}:${rp.permission.action}: ${rp.permission.description || 'N/A'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addApprovalsUpdateToAdmin();
