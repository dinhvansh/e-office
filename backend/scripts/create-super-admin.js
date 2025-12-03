const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createSuperAdmin() {
  console.log('🔧 Creating Super Admin...\n');

  try {
    // Check if admin@acme.local exists
    const existingAdmin = await prisma.users.findUnique({
      where: { email: 'admin@acme.local' }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      console.log('   Email: admin@acme.local');
      console.log('   Current role:', existingAdmin.role);
      
      // Update to super_admin if not already
      if (existingAdmin.role !== 'super_admin') {
        await prisma.users.update({
          where: { id: existingAdmin.id },
          data: { role: 'super_admin' }
        });
        console.log('   ✅ Updated role to: super_admin');
      } else {
        console.log('   ✅ Already a super_admin');
      }
    } else {
      console.log('❌ Admin user not found. Creating new super admin...');
      
      // Get default tenant
      const defaultTenant = await prisma.tenants.findFirst({
        where: { id: 1 }
      });

      if (!defaultTenant) {
        console.log('❌ Default tenant not found. Please run seed script first.');
        return;
      }

      // Create super admin
      const passwordHash = await bcrypt.hash('admin123', 10);
      
      const superAdmin = await prisma.users.create({
        data: {
          email: 'admin@acme.local',
          password_hash: passwordHash,
          full_name: 'Super Admin',
          tenant_id: defaultTenant.id,
          status: 'active',
          role: 'super_admin'
        }
      });

      console.log('✅ Super Admin created successfully!');
      console.log('   Email: admin@acme.local');
      console.log('   Password: admin123');
      console.log('   Role: super_admin');
    }

    console.log('\n🎯 Super Admin Capabilities:');
    console.log('   ✅ Can see users from ALL tenants');
    console.log('   ✅ Can approve/reject users from ANY tenant');
    console.log('   ✅ Full system access');

    console.log('\n🔐 Login:');
    console.log('   URL: http://localhost:3000/login');
    console.log('   Email: admin@acme.local');
    console.log('   Password: admin123');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();
