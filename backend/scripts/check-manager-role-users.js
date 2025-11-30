const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkManagerRoleUsers() {
  try {
    console.log('🔍 Checking Manager role users...\n');

    // Find Manager role
    const managerRole = await prisma.roles.findFirst({
      where: {
        name: 'Manager',
      },
      include: {
        _count: {
          select: { user_roles: true },
        },
      },
    });

    if (!managerRole) {
      console.log('❌ Manager role not found');
      return;
    }

    console.log('✅ Manager Role:');
    console.log(`   ID: ${managerRole.id}`);
    console.log(`   Name: ${managerRole.name}`);
    console.log(`   User count: ${managerRole._count.user_roles}`);
    console.log('');

    // Get all users with Manager role
    const userRoles = await prisma.user_roles.findMany({
      where: {
        role_id: managerRole.id,
      },
      include: {
        user: {
          include: {
            department: true,
            position: true,
          },
        },
      },
    });

    if (userRoles.length === 0) {
      console.log('📋 No users have Manager role');
      return;
    }

    console.log(`📋 Users with Manager role (${userRoles.length}):\n`);
    userRoles.forEach((ur, index) => {
      const user = ur.user;
      console.log(`${index + 1}. ${user.full_name || user.email}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Status: ${user.status}`);
      if (user.department) {
        console.log(`   Department: ${user.department.name}`);
      }
      if (user.position) {
        console.log(`   Position: ${user.position.name}`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkManagerRoleUsers();
