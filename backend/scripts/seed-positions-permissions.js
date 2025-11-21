/**
 * Seed Permissions for Positions Module
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding positions permissions...\n');

  const tenant = await prisma.tenants.findFirst();
  if (!tenant) {
    throw new Error('No tenant found');
  }

  // Create permissions for positions
  const permissionsData = [
    { resource: 'positions', action: 'create', description: 'Create positions' },
    { resource: 'positions', action: 'read', description: 'View positions' },
    { resource: 'positions', action: 'update', description: 'Update positions' },
    { resource: 'positions', action: 'delete', description: 'Delete positions' },
  ];

  const createdPermissions = [];

  for (const perm of permissionsData) {
    const existing = await prisma.permissions.findFirst({
      where: {
        resource: perm.resource,
        action: perm.action,
      },
    });

    if (existing) {
      console.log(`✓ Permission exists: ${perm.resource}:${perm.action}`);
      createdPermissions.push(existing);
    } else {
      const created = await prisma.permissions.create({
        data: perm,
      });
      console.log(`✅ Created permission: ${perm.resource}:${perm.action}`);
      createdPermissions.push(created);
    }
  }

  // Assign to Admin role
  const adminRole = await prisma.roles.findFirst({
    where: {
      tenant_id: tenant.id,
      name: 'Admin',
    },
  });

  if (!adminRole) {
    console.log('⚠️  Admin role not found');
    return;
  }

  console.log('\n📝 Assigning permissions to Admin role...');

  for (const perm of createdPermissions) {
    const existing = await prisma.role_permissions.findFirst({
      where: {
        role_id: adminRole.id,
        permission_id: perm.id,
      },
    });

    if (existing) {
      console.log(`✓ Already assigned: ${perm.resource}:${perm.action}`);
    } else {
      await prisma.role_permissions.create({
        data: {
          role_id: adminRole.id,
          permission_id: perm.id,
        },
      });
      console.log(`✅ Assigned: ${perm.resource}:${perm.action}`);
    }
  }

  console.log('\n✅ Positions permissions seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
