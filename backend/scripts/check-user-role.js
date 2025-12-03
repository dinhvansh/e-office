const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserRole() {
  const email = process.argv[2] || 'vanqn95@gmail.com';
  
  console.log(`🔍 Checking user: ${email}\n`);

  try {
    const user = await prisma.users.findUnique({
      where: { email },
      include: {
        tenant: true,
        user_roles: {
          include: {
            role: {
              include: {
                role_permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('👤 User Information:');
    console.log('─'.repeat(60));
    console.log(`Name: ${user.full_name || 'N/A'}`);
    console.log(`Email: ${user.email}`);
    console.log(`Status: ${user.status}`);
    console.log(`Legacy Role: ${user.role}`);
    console.log(`Tenant: ${user.tenant?.name} (ID: ${user.tenant_id})`);
    console.log(`Created: ${user.created_at.toLocaleString('vi-VN')}`);

    console.log('\n🎭 RBAC Roles:');
    console.log('─'.repeat(60));
    if (user.user_roles.length === 0) {
      console.log('❌ No RBAC roles assigned');
    } else {
      user.user_roles.forEach((ur, index) => {
        console.log(`${index + 1}. ${ur.role.name}`);
        console.log(`   Description: ${ur.role.description || 'N/A'}`);
        console.log(`   Permissions: ${ur.role.role_permissions.length}`);
      });
    }

    console.log('\n🔑 Permissions:');
    console.log('─'.repeat(60));
    const allPermissions = new Set();
    user.user_roles.forEach(ur => {
      ur.role.role_permissions.forEach(rp => {
        allPermissions.add(`${rp.permission.resource}:${rp.permission.action}`);
      });
    });

    if (allPermissions.size === 0) {
      console.log('❌ No permissions');
    } else {
      const permArray = Array.from(allPermissions).sort();
      permArray.forEach((perm, index) => {
        console.log(`${index + 1}. ${perm}`);
      });
      console.log(`\nTotal: ${allPermissions.size} permissions`);
    }

    // Check if admin
    const isAdmin = user.role === 'admin' || 
                    user.user_roles.some(ur => ur.role.name === 'Admin');
    
    console.log('\n🎯 Summary:');
    console.log('─'.repeat(60));
    console.log(`Is Admin: ${isAdmin ? '✅ YES' : '❌ NO'}`);
    console.log(`Can manage tenant: ${isAdmin ? '✅ YES' : '❌ NO'}`);
    console.log(`Full access: ${isAdmin ? '✅ YES' : '❌ NO'}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserRole();
