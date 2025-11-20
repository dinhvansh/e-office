const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addWorkflowPermissions() {
  try {
    console.log('🔄 Adding workflow permissions...\n');

    // Get Admin role
    const adminRole = await prisma.roles.findFirst({
      where: { name: 'Admin' }
    });

    if (!adminRole) {
      console.log('❌ Admin role not found!');
      return;
    }

    console.log('✅ Found Admin role:', adminRole.name);

    // Workflow permissions to add
    const workflowPermissions = [
      { resource: 'workflows', action: 'create', description: 'Create workflows' },
      { resource: 'workflows', action: 'read', description: 'View workflows' },
      { resource: 'workflows', action: 'update', description: 'Update workflows' },
      { resource: 'workflows', action: 'delete', description: 'Delete workflows' },
      { resource: 'approvals', action: 'create', description: 'Submit for approval' },
      { resource: 'approvals', action: 'read', description: 'View approvals' },
      { resource: 'approvals', action: 'approve', description: 'Approve documents' },
      { resource: 'approvals', action: 'reject', description: 'Reject documents' },
    ];

    console.log('\n📋 Creating permissions...');

    for (const perm of workflowPermissions) {
      // Check if permission exists
      const existing = await prisma.permissions.findFirst({
        where: {
          resource: perm.resource,
          action: perm.action,
        },
      });

      let permission;
      if (existing) {
        console.log(`  ⏭️  Permission already exists: ${perm.resource}:${perm.action}`);
        permission = existing;
      } else {
        permission = await prisma.permissions.create({
          data: perm,
        });
        console.log(`  ✅ Created permission: ${perm.resource}:${perm.action}`);
      }

      // Assign to Admin role
      const rolePermExists = await prisma.role_permissions.findFirst({
        where: {
          role_id: adminRole.id,
          permission_id: permission.id,
        },
      });

      if (!rolePermExists) {
        await prisma.role_permissions.create({
          data: {
            role_id: adminRole.id,
            permission_id: permission.id,
          },
        });
        console.log(`    → Assigned to Admin role`);
      }
    }

    console.log('\n✅ Workflow permissions added successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - ${workflowPermissions.length} permissions processed`);
    console.log('  - All assigned to Admin role');
    console.log('\n🎯 Admin can now access:');
    console.log('  - /workflows page');
    console.log('  - /approvals page');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

addWorkflowPermissions();
