const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function checkAdminUser() {
  try {
    console.log('🔍 Checking admin user...\n');

    const user = await prisma.users.findFirst({
      where: { email: 'admin@acme.local' },
      include: {
        tenant: true,
        user_roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      console.log('❌ User not found: admin@acme.local');
      console.log('\n💡 Creating admin user...');
      
      const tenant = await prisma.tenants.findFirst();
      if (!tenant) {
        console.log('❌ No tenant found!');
        return;
      }

      const password = process.env.DEMO_ADMIN_PASSWORD;
      if (!password) throw new Error('DEMO_ADMIN_PASSWORD is required');
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await prisma.users.create({
        data: {
          tenant_id: tenant.id,
          email: 'admin@acme.local',
          password_hash: hashedPassword,
          full_name: 'Admin User',
          role: 'admin',
          status: 'active',
        },
      });

      console.log('✅ Created user:', newUser.email);
      console.log('   Password: supplied through DEMO_ADMIN_PASSWORD');
      
      // Assign Admin role
      const adminRole = await prisma.roles.findFirst({
        where: { name: 'Admin', tenant_id: tenant.id },
      });

      if (adminRole) {
        await prisma.user_roles.create({
          data: {
            user_id: newUser.id,
            role_id: adminRole.id,
          },
        });
        console.log('✅ Assigned Admin role');
      }

      return;
    }

    console.log('✅ User found:', user.email);
    console.log('   ID:', user.id);
    console.log('   Tenant:', user.tenant?.name);
    console.log('   Status:', user.status);
    console.log('   Role (legacy):', user.role);
    console.log('   Roles (RBAC):', user.user_roles.map(ur => ur.role.name).join(', '));

    // Test password
    console.log('\n🔐 Testing password...');
    const password = process.env.DEMO_ADMIN_PASSWORD;
    if (!password) throw new Error('DEMO_ADMIN_PASSWORD is required');
    const isValid = await bcrypt.compare(password, user.password_hash);
    console.log('   DEMO_ADMIN_PASSWORD:', isValid ? '✅ Valid' : '❌ Invalid');

    if (!isValid) {
      console.log('\n💡 Resetting password from DEMO_ADMIN_PASSWORD...');
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.users.update({
        where: { id: user.id },
        data: { password_hash: hashedPassword },
      });
      console.log('✅ Password reset successfully!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminUser();
