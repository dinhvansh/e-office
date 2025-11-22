const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking all roles and permissions...\n');
  
  const roles = await prisma.roles.findMany({
    include: {
      role_permissions: {
        include: {
          permission: true
        }
      }
    },
    orderBy: { name: 'asc' }
  });
  
  console.log(`Found ${roles.length} roles:\n`);
  
  roles.forEach(role => {
    console.log(`📋 ${role.name} (ID: ${role.id})`);
    console.log(`   Description: ${role.description || 'N/A'}`);
    console.log(`   Permissions: ${role.role_permissions.length}`);
    
    if (role.role_permissions.length > 0) {
      role.role_permissions.forEach(rp => {
        console.log(`      - ${rp.permission.code}: ${rp.permission.name}`);
      });
    } else {
      console.log('      ⚠️  NO PERMISSIONS!');
    }
    console.log('');
  });
  
  // Check permissions table
  const allPermissions = await prisma.permissions.count();
  console.log(`\n📊 Total permissions in database: ${allPermissions}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
