const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function makeTenantAdmin() {
  const email = process.argv[2];
  
  if (!email) {
    console.log('Usage: node make-tenant-admin.js <email>');
    console.log('Example: node make-tenant-admin.js vanqn95@gmail.com');
    return;
  }

  console.log(`🔧 Making ${email} admin of their tenant...\n`);

  try {
    const user = await prisma.users.findUnique({
      where: { email },
      include: { tenant: true }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`Found user: ${user.full_name || email}`);
    console.log(`Tenant: ${user.tenant?.name} (ID: ${user.tenant_id})`);

    // Update legacy role
    await prisma.users.update({
      where: { id: user.id },
      data: { role: 'admin' }
    });
    console.log('✅ Updated legacy role to: admin');

    // Find or create Admin role for tenant
    let adminRole = await prisma.roles.findFirst({
      where: {
        tenant_id: user.tenant_id,
        name: 'Admin'
      }
    });

    if (!adminRole) {
      console.log('Creating Admin role for tenant...');
      adminRole = await prisma.roles.create({
        data: {
          name: 'Admin',
          description: 'Administrator with full access',
          tenant_id: user.tenant_id
        }
      });

      // Assign all permissions
      const allPermissions = await prisma.permissions.findMany();
      for (const permission of allPermissions) {
        await prisma.role_permissions.create({
          data: {
            role_id: adminRole.id,
            permission_id: permission.id
          }
        }).catch(() => {}); // Ignore duplicates
      }
      console.log(`✅ Created Admin role with ${allPermissions.length} permissions`);
    }

    // Remove existing user roles
    await prisma.user_roles.deleteMany({
      where: { user_id: user.id }
    });

    // Assign Admin role
    await prisma.user_roles.create({
      data: {
        user_id: user.id,
        role_id: adminRole.id
      }
    });

    console.log('✅ Assigned Admin role to user');

    console.log('\n🎉 Success!');
    console.log(`${user.full_name || email} is now admin of ${user.tenant?.name}`);
    console.log('\n🔐 User can now:');
    console.log('   ✅ Manage users in their tenant');
    console.log('   ✅ Approve/reject registrations');
    console.log('   ✅ Full access to tenant features');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

makeTenantAdmin();
