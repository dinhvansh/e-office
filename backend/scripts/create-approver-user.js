const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createApproverUser() {
  console.log('🔧 Creating approver user...\n');

  try {
    const tenantId = 1;
    const email = 'approver@acme.local';
    const password = process.env.DEMO_ADMIN_PASSWORD;
    if (!password) throw new Error('DEMO_ADMIN_PASSWORD is required');

    // 1. Check if user exists
    const existing = await prisma.users.findFirst({
      where: { email, tenant_id: tenantId },
    });

    if (existing) {
      console.log('✅ User already exists:', email);
      console.log('   User ID:', existing.id);
      
      // 2. Update approval record to use this user
      console.log('\n🔄 Updating approval record...');
      const updated = await prisma.document_approvals.updateMany({
        where: {
          id: 1,
        },
        data: {
          approver_user_id: existing.id,
        },
      });
      
      console.log('✅ Updated', updated.count, 'approval records');
      console.log('\n📋 Login credentials:');
      console.log('   Email:', email);
      console.log('   Password:', password);
      console.log('\n🌐 Test URL:');
      console.log('   http://localhost:3000/approvals');
      
      return;
    }

    // 3. Create new user
    console.log('📝 Creating new user:', email);
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.users.create({
      data: {
        tenant_id: tenantId,
        email,
        password_hash: hashedPassword,
        full_name: 'Người phê duyệt',
        status: 'active',
      },
    });

    console.log('✅ User created with ID:', user.id);

    // 4. Assign Manager role
    const managerRole = await prisma.roles.findFirst({
      where: { name: 'Manager', tenant_id: tenantId },
    });

    if (managerRole) {
      await prisma.user_roles.create({
        data: {
          user_id: user.id,
          role_id: managerRole.id,
        },
      });
      console.log('✅ Assigned Manager role');
    }

    // 5. Update approval record
    console.log('\n🔄 Updating approval record...');
    const updated = await prisma.document_approvals.updateMany({
      where: {
        id: 1,
      },
      data: {
        approver_user_id: user.id,
      },
    });
    
    console.log('✅ Updated', updated.count, 'approval records');

    console.log('\n📋 Login credentials:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('\n🌐 Test URL:');
    console.log('   http://localhost:3000/approvals');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

createApproverUser();
