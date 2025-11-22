const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking admin permissions...\n');
  
  // Find admin user
  const admin = await prisma.users.findFirst({
    where: { email: 'admin@acme.local' },
    include: {
      tenant: true,
      department: true
    }
  });
  
  if (!admin) {
    console.log('❌ Admin user not found');
    return;
  }
  
  console.log('✅ Admin User:');
  console.log('   Email:', admin.email);
  console.log('   Role (old):', admin.role);
  console.log('   Tenant:', admin.tenant.name);
  console.log('   Department:', admin.department?.name || 'None');
  console.log('');
  
  // Get user roles
  const userRoles = await prisma.user_roles.findMany({
    where: { user_id: admin.id },
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
  });
  
  console.log('📋 Assigned Roles:', userRoles.length);
  userRoles.forEach(ur => {
    console.log('   -', ur.role.name);
  });
  console.log('');
  
  // Get all permissions
  const allPermissions = new Set();
  userRoles.forEach(ur => {
    ur.role.role_permissions.forEach(rp => {
      allPermissions.add(rp.permission.code);
    });
  });
  
  console.log('🔐 Total Permissions:', allPermissions.size);
  
  // Group by resource
  const permsByResource = {};
  allPermissions.forEach(code => {
    const [resource] = code.split(':');
    if (!permsByResource[resource]) {
      permsByResource[resource] = [];
    }
    permsByResource[resource].push(code);
  });
  
  Object.keys(permsByResource).sort().forEach(resource => {
    console.log(`   ${resource}:`, permsByResource[resource].join(', '));
  });
  
  console.log('');
  
  // Check specific permissions
  const requiredPerms = [
    'documents:read',
    'documents:create',
    'document-types:read',
    'workflows:read'
  ];
  
  console.log('✅ Required Permissions Check:');
  requiredPerms.forEach(perm => {
    const has = allPermissions.has(perm);
    console.log(`   ${has ? '✅' : '❌'} ${perm}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
