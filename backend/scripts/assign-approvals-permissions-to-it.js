const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignApprovalsPermissionsToIT() {
  console.log('🔧 Assigning approvals permissions to IT user\n');

  try {
    // Get IT user
    const itUser = await prisma.users.findFirst({
      where: { email: 'dir.it@acme.local' },
      include: {
        user_roles: {
          include: { role: true }
        }
      }
    });

    if (!itUser) {
      console.log('❌ IT user not found');
      return;
    }

    console.log('✅ Found IT user:', itUser.email);
    console.log('   Current roles:', itUser.user_roles.map(ur => ur.role.name).join(', '));
    console.log('');

    // Get Manager role
    const managerRole = await prisma.roles.findFirst({
      where: { name: 'Manager' }
    });

    if (!managerRole) {
      console.log('❌ Manager role not found');
      return;
    }

    // Check if user already has Manager role
    const hasManagerRole = itUser.user_roles.some(ur => ur.role_id === managerRole.id);

    if (!hasManagerRole) {
      console.log('📋 Assigning Manager role...');
      await prisma.user_roles.create({
        data: {
          user_id: itUser.id,
          role_id: managerRole.id
        }
      });
      console.log('✅ Manager role assigned');
    } else {
      console.log('✅ User already has Manager role');
    }

    // Get approval permissions
    const approvalPermissions = await prisma.permissions.findMany({
      where: {
        resource: 'approvals'
      }
    });

    console.log(`\n📋 Found ${approvalPermissions.length} approval permissions:`);
    approvalPermissions.forEach(p => {
      console.log(`   - ${p.resource}:${p.action}`);
    });

    // Assign permissions to Manager role
    console.log('\n🔧 Assigning permissions to Manager role...');
    
    for (const permission of approvalPermissions) {
      const existing = await prisma.role_permissions.findUnique({
        where: {
          role_id_permission_id: {
            role_id: managerRole.id,
            permission_id: permission.id
          }
        }
      });

      if (!existing) {
        await prisma.role_permissions.create({
          data: {
            role_id: managerRole.id,
            permission_id: permission.id
          }
        });
        console.log(`   ✓ Added ${permission.resource}:${permission.action}`);
      } else {
        console.log(`   - Already has ${permission.resource}:${permission.action}`);
      }
    }

    console.log('\n✅ Done!');
    console.log('\nIT user now has:');
    console.log('   - Manager role');
    console.log('   - All approval permissions');
    console.log('\nYou can now login as:');
    console.log('   Email: dir.it@acme.local');
    console.log('   Password: supplied through DEMO_ADMIN_PASSWORD');

    await prisma.$disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

assignApprovalsPermissionsToIT();
