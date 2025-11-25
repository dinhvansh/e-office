const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createTestAccounts() {
  console.log('🔧 Creating test accounts for approval workflow...\n');

  try {
    // Get tenant
    const tenant = await prisma.tenants.findFirst();
    if (!tenant) {
      console.log('❌ No tenant found');
      return;
    }

    // Get Manager role (for approver)
    const managerRole = await prisma.roles.findFirst({
      where: { 
        tenant_id: tenant.id,
        name: 'Manager'
      }
    });

    // Get User role (for document creator)
    const userRole = await prisma.roles.findFirst({
      where: { 
        tenant_id: tenant.id,
        name: 'User'
      }
    });

    if (!managerRole || !userRole) {
      console.log('❌ Roles not found');
      return;
    }

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Account 1: Document Creator (User role)
    const creator = await prisma.users.upsert({
      where: { email: 'creator@acme.local' },
      update: {},
      create: {
        tenant_id: tenant.id,
        email: 'creator@acme.local',
        password_hash: hashedPassword,
        full_name: 'Nguyễn Văn A',
        phone: '0901234567',
        is_active: true
      }
    });

    // Assign User role to creator
    await prisma.user_roles.upsert({
      where: {
        user_id_role_id: {
          user_id: creator.id,
          role_id: userRole.id
        }
      },
      update: {},
      create: {
        user_id: creator.id,
        role_id: userRole.id
      }
    });

    console.log('✅ Account 1 (Creator):');
    console.log('   Email: creator@acme.local');
    console.log('   Password: password123');
    console.log('   Name: Nguyễn Văn A');
    console.log('   Role: User');
    console.log('   Purpose: Upload document & submit for approval\n');

    // Account 2: Approver (Manager role)
    const approver = await prisma.users.upsert({
      where: { email: 'approver@acme.local' },
      update: {},
      create: {
        tenant_id: tenant.id,
        email: 'approver@acme.local',
        password_hash: hashedPassword,
        full_name: 'Trần Thị B',
        phone: '0907654321',
        is_active: true
      }
    });

    // Assign Manager role to approver
    await prisma.user_roles.upsert({
      where: {
        user_id_role_id: {
          user_id: approver.id,
          role_id: managerRole.id
        }
      },
      update: {},
      create: {
        user_id: approver.id,
        role_id: managerRole.id
      }
    });

    console.log('✅ Account 2 (Approver):');
    console.log('   Email: approver@acme.local');
    console.log('   Password: password123');
    console.log('   Name: Trần Thị B');
    console.log('   Role: Manager');
    console.log('   Purpose: Approve documents\n');

    console.log('════════════════════════════════════════════════════════════');
    console.log('🎉 TEST ACCOUNTS CREATED!');
    console.log('════════════════════════════════════════════════════════════\n');

    console.log('📋 TEST WORKFLOW:');
    console.log('1. Login as creator@acme.local');
    console.log('2. Upload document (choose "Hợp đồng" type)');
    console.log('3. Add external signer');
    console.log('4. Add signature fields');
    console.log('5. Click "Trình duyệt" (Submit for approval)');
    console.log('6. Logout');
    console.log('7. Login as approver@acme.local');
    console.log('8. Go to "Phê duyệt của tôi"');
    console.log('9. Click "Xử lý" to approve');
    console.log('10. Add signature and approve');
    console.log('11. Document sent to external signer\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAccounts();
