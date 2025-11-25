/**
 * Script: Add users:read permission to User role
 * User role needs to read users list for selecting signers
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addUsersReadToUser() {
  try {
    console.log('🔧 Adding users:read permission to User role...\n');

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

      // Get users:read permission
      const permission = await prisma.permissions.findFirst({
        where: {
          resource: 'users',
          action: 'read'
        }
      });

      if (!permission) {
        console.log('   ❌ users:read permission not found!\n');
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

      console.log('   ✅ users:read permission assigned!\n');
    }

    console.log('🎉 Done!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addUsersReadToUser();
