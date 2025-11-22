const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing admin permissions...');
  
  // Find admin user
  const admin = await prisma.users.findFirst({
    where: { email: 'admin@acme.local' }
  });
  
  if (!admin) {
    console.log('❌ Admin user not found');
    return;
  }
  
  console.log('✅ Found admin user:', admin.email);
  
  // Find Admin role
  const adminRole = await prisma.roles.findFirst({
    where: { 
      tenant_id: admin.tenant_id,
      name: 'Admin'
    }
  });
  
  if (!adminRole) {
    console.log('❌ Admin role not found');
    return;
  }
  
  console.log('✅ Found Admin role:', adminRole.name);
  
  // Assign role to user
  await prisma.user_roles.upsert({
    where: {
      user_id_role_id: {
        user_id: admin.id,
        role_id: adminRole.id
      }
    },
    create: {
      user_id: admin.id,
      role_id: adminRole.id
    },
    update: {}
  });
  
  console.log('✅ Admin role assigned successfully!');
  
  // Verify
  const userRoles = await prisma.user_roles.findMany({
    where: { user_id: admin.id },
    include: { role: true }
  });
  
  console.log('📋 User roles:', userRoles.map(ur => ur.role.name).join(', '));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
