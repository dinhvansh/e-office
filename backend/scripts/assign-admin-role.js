const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Assigning Admin role to user...');
  
  // Get admin user
  const user = await prisma.users.findFirst({
    where: { email: 'admin@acme.local' }
  });
  
  if (!user) {
    console.error('❌ User not found');
    return;
  }
  
  // Get Admin role
  const adminRole = await prisma.roles.findFirst({
    where: { name: 'Admin', tenant_id: user.tenant_id }
  });
  
  if (!adminRole) {
    console.error('❌ Admin role not found');
    return;
  }
  
  // Assign role to user
  await prisma.user_roles.upsert({
    where: {
      user_id_role_id: {
        user_id: user.id,
        role_id: adminRole.id
      }
    },
    update: {},
    create: {
      user_id: user.id,
      role_id: adminRole.id
    }
  });
  
  console.log(`✅ Assigned role "${adminRole.name}" to user "${user.email}"`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
