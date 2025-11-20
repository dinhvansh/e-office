const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdminPermissions() {
  try {
    console.log('🔍 Checking admin@acme.local permissions...\n');
    
    // Find user with all relations
    const user = await prisma.users.findFirst({
      where: { email: 'admin@acme.local' },
      include: { 
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
      console.log('❌ User not found!');
      return;
    }

    console.log('✅ User found:', user.email);
    console.log('User ID:', user.id);
    console.log('Tenant ID:', user.tenant_id);
    console.log('\n📊 Roles:');
    
    if (user.user_roles.length === 0) {
      console.log('❌ No roles assigned!');
    } else {
      user.user_roles.forEach(ur => {
        console.log(`  - ${ur.role.name} (ID: ${ur.role.id})`);
        console.log(`    Permissions: ${ur.role.role_permissions.length}`);
        
        if (ur.role.role_permissions.length > 0) {
          console.log('    Details:');
          ur.role.role_permissions.forEach(rp => {
            console.log(`      • ${rp.permission.resource}:${rp.permission.action}`);
          });
        }
      });
    }

    // Check all available permissions
    console.log('\n📋 All available permissions in system:');
    const allPermissions = await prisma.permissions.findMany({
      where: { tenant_id: user.tenant_id }
    });
    console.log(`Total: ${allPermissions.length} permissions`);
    
    // Group by resource
    const grouped = {};
    allPermissions.forEach(p => {
      if (!grouped[p.resource]) grouped[p.resource] = [];
      grouped[p.resource].push(p.action);
    });
    
    Object.keys(grouped).forEach(resource => {
      console.log(`  ${resource}: ${grouped[resource].join(', ')}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminPermissions();
