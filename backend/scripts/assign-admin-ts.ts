import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function assignAdminRole() {
  try {
    console.log('🔍 Looking for admin@acme.local...');
    
    // Find admin user
    const user = await prisma.users.findFirst({
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
      const users = await prisma.users.findMany({
        select: { email: true, role: true }
      });
      console.log('💡 Available users:');
      users.forEach(u => console.log(`   - ${u.email} (role: ${u.role})`));
      return;
    }

    console.log(`✅ Found user: ${user.email}`);
    console.log(`   Current role field: ${user.role}`);

    // Update role field to Admin
    await prisma.users.update({
      where: { id: user.id },
      data: { role: 'Admin' }
    });

    console.log('✅ Updated user.role to "Admin"');

    // Find Admin role
    const adminRole = await prisma.roles.findFirst({
      where: { 
        name: 'Admin',
        tenant_id: user.tenant_id 
      }
    });

    if (!adminRole) {
      console.log('❌ Admin role not found');
      return;
    }

    // Check if already assigned
    const existing = await prisma.user_roles.findFirst({
      where: {
        user_id: user.id,
        role_id: adminRole.id
      }
    });

    if (existing) {
      console.log('✅ User already has Admin role in user_roles');
    } else {
      await prisma.user_roles.create({
        data: {
          user_id: user.id,
          role_id: adminRole.id
        }
      });
      console.log('✅ Admin role assigned in user_roles');
    }

    console.log('\n🎉 Done! admin@acme.local is now Admin');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

assignAdminRole();
