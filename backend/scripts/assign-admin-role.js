const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignAdminRole() {
  try {
    // Find admin user
    const user = await prisma.user.findFirst({
      where: { email: 'admin@acme.com' }
    });

    if (!user) {
      console.log('❌ User admin@acme.com not found');
      return;
    }

    // Find Admin role
    const adminRole = await prisma.role.findFirst({
      where: { name: 'Admin' }
    });

    if (!adminRole) {
      console.log('❌ Admin role not found. Run seed-rbac.js first!');
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
      console.log('✅ User already has Admin role');
      return;
    }

    // Assign Admin role
    await prisma.userRole.create({
      data: {
        user_id: user.id,
        role_id: adminRole.id
      }
    });

    console.log('✅ Admin role assigned to', user.email);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

assignAdminRole();
