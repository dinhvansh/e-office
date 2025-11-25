/**
 * Script: Add workflows:read permission to User role
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addWorkflowsReadToUser() {
  try {
    console.log('🔧 Adding workflows:read permission to User role...\n');

    const tenants = await prisma.tenants.findMany();

    for (const tenant of tenants) {
      console.log(`🏢 Tenant: ${tenant.name || tenant.id}`);

      // Get User role
      const userRole = await prisma.roles.findFirst({
        where: {
          tenant_id: tenant.id,
          name: { contains: 'User', mode: 'insensitive' }
        }
      });

      if (!userRole) {
        console.log('   ⚠️ User role not found\n');
        continue;
      }

      console.log(`   ✅ Found User role (ID: ${userRole.id})`);

      // Get workflows:read permission
      const permission = await prisma.permissions.findFirst({
        where: {
          resource: 'workflows',
          action: 'read'
        }
      });

      if (!permission) {
        console.log('   ❌ workflows:read permission not found!\n');
        continue;
      }

      // Check if already assigned
      const existing = await prisma.role_permissions.findUnique({
        where: {
          role_id_permission_id: {
            role_id: userRole.id,
            permission_id: permission.id
          }
        }
      });

      if (existing) {
        console.log('   ℹ️ Permission already assigned\n');
        continue;
      }

      // Assign permission
      await prisma.role_permissions.create({
        data: {
          role_id: userRole.id,
          permission_id: permission.id
        }
      });

      console.log('   ✅ Permission assigned!\n');
    }

    console.log('🎉 Done!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addWorkflowsReadToUser();
