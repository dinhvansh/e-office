const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignAdminRole() {
  try {
    console.log('🔍 Looking for admin@acme.local...');
    
    // Find user
    const user = await prisma.users.findFirst({
      where: { email: 'admin@acme.local' },
      include: { user_roles: { include: { role: true } } }
    });

    if (!user) {
      console.log('❌ User admin@acme.local not found!');
      console.log('Creating user...');
      
      // Create user if not exists
      const bcrypt = require('bcrypt');
      const password = process.env.DEMO_ADMIN_PASSWORD;
      if (!password) throw new Error('DEMO_ADMIN_PASSWORD is required');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const newUser = await prisma.users.create({
        data: {
          email: 'admin@acme.local',
          password_hash: hashedPassword,
          full_name: 'Admin User',
          tenant_id: 1,
          status: 'active',
          role: 'admin'
        }
      });
      
      console.log('✅ User created:', newUser.email);
      user = newUser;
    } else {
      console.log('✅ User found:', user.email);
      console.log('Current roles:', user.user_roles.map(ur => ur.role.name).join(', ') || 'None');
    }

    // Find Admin role
    console.log('\n🔍 Looking for Admin role...');
    const adminRole = await prisma.roles.findFirst({
      where: { 
        name: 'Admin',
        tenant_id: user.tenant_id
      }
    });

    if (!adminRole) {
      console.log('❌ Admin role not found!');
      console.log('Run seed script first: npm run seed');
      return;
    }

    console.log('✅ Admin role found:', adminRole.name);

    // Check if already has Admin role
    const existingRole = await prisma.user_roles.findFirst({
      where: {
        user_id: user.id,
        role_id: adminRole.id
      }
    });

    if (existingRole) {
      console.log('\n✅ User already has Admin role!');
      return;
    }

    // Assign Admin role
    console.log('\n🔧 Assigning Admin role...');
    await prisma.user_roles.create({
      data: {
        user_id: user.id,
        role_id: adminRole.id
      }
    });

    console.log('✅ Admin role assigned successfully!');
    
    // Verify
    const updatedUser = await prisma.users.findUnique({
      where: { id: user.id },
      include: { 
        user_roles: { 
          include: { 
            role: { 
              include: { 
                role_permissions: { 
                  include: { permission: true } 
                } 
              } 
            } 
          } 
        } 
      }
    });

    console.log('\n📊 Final status:');
    console.log('User:', updatedUser.email);
    console.log('Roles:', updatedUser.user_roles.map(ur => ur.role.name).join(', '));
    console.log('Permissions:', updatedUser.user_roles[0]?.role.role_permissions.length || 0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

assignAdminRole();
