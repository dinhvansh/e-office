const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/esign_dev'
    }
  }
});

async function assignAdminRole() {
  try {
    console.log('🔍 Looking for admin@acme.local...');
    
    // Find admin user
    const user = await prisma.user.findFirst({
      where: { email: 'admin@acme.local' },
      include: {
        user_roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      console.log('❌ User admin@acme.local not found');
      console.log('💡 Available users:');
      const users = await prisma.user.findMany({
        select: { email: true, role: true }
      });
      users.forEach(u => console.log(`   - ${u.email} (role: ${u.role})`));
      return;
    }

    console.log(`✅ Found user: ${user.email}`);
    console.log(`   Current role field: ${user.role}`);
    console.log(`   Current user_roles:`, user.user_roles.map(ur => ur.role.name));

    // Update role field to Admin
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'Admin' }
    });

    console.log('✅ Updated user.role to "Admin"');

    // Find Admin role
    const adminRole = await prisma.role.findFirst({
      where: { 
        name: 'Admin',
        tenant_id: user.tenant_id 
      }
    });

    if (!adminRole) {
      console.log('❌ Admin role not found for this tenant');
      console.log('💡 Available roles:');
      const roles = await prisma.role.findMany({
        where: { tenant_id: user.tenant_id },
        select: { name: true }
      });
      roles.forEach(r => console.log(`   - ${r.name}`));
      return;
    }

    // Check if already assigned
    const existing = await prisma.userRole.findFirst({
      where: {
        user_id: user.id,
        role_id: adminRole.id
      }
    });

    if (existing) {
      console.log('✅ User already has Admin role in user_roles table');
    } else {
      // Assign Admin role
      await prisma.userRole.create({
        data: {
          user_id: user.id,
          role_id: adminRole.id
        }
      });
      console.log('✅ Admin role assigned in user_roles table');
    }

    console.log('\n🎉 Done! admin@acme.local is now Admin');
    console.log('   - user.role = "Admin"');
    console.log('   - user_roles table updated');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

assignAdminRole();
