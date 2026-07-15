/**
 * Script: Create 2 test accounts for approval workflow
 * 
 * Account 1: Người tạo tài liệu (Creator)
 * - Email: creator@acme.local
 * - Password: DEMO_ADMIN_PASSWORD (required)
 * - Role: User (có quyền tạo tài liệu)
 * 
 * Account 2: Người phê duyệt (Approver)
 * - Email: approver@acme.local
 * - Password: DEMO_ADMIN_PASSWORD (required)
 * - Role: Manager (có quyền phê duyệt)
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createApprovalTestUsers() {
  try {
    console.log('🔧 Creating 2 test accounts for approval workflow...\n');

    // Hash password
    const password = process.env.DEMO_ADMIN_PASSWORD;
    if (!password) throw new Error('DEMO_ADMIN_PASSWORD is required');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get tenant ID (ACME Corporation)
    const tenant = await prisma.tenants.findFirst({
      where: { 
        name: { contains: 'ACME', mode: 'insensitive' }
      }
    });

    if (!tenant) {
      throw new Error('Tenant ACME not found');
    }

    // Get roles
    const userRole = await prisma.roles.findFirst({
      where: { 
        tenant_id: tenant.id,
        name: { contains: 'User', mode: 'insensitive' }
      }
    });

    const managerRole = await prisma.roles.findFirst({
      where: { 
        tenant_id: tenant.id,
        name: { contains: 'Manager', mode: 'insensitive' }
      }
    });

    if (!userRole || !managerRole) {
      throw new Error('Required roles not found');
    }

    // Get a department
    const department = await prisma.departments.findFirst({
      where: { tenant_id: tenant.id }
    });

    // Account 1: Document Creator (User role)
    console.log('📝 Creating Account 1: Document Creator...');
    const creator = await prisma.users.upsert({
      where: {
        email: "creator@acme.local"
      },
      update: {},
      create: {
        tenant_id: tenant.id,
        email: "creator@acme.local",
        password_hash: hashedPassword,
        full_name: "Nguyễn Văn A (Creator)",
        phone: "0901234567",
        department_id: department?.id,
        status: 'active'
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

    console.log('✅ Creator account created:');
    console.log(`   Email: creator@acme.local`);
    console.log('   Password: supplied through DEMO_ADMIN_PASSWORD');
    console.log(`   Role: User`);
    console.log(`   ID: ${creator.id}\n`);

    // Account 2: Approver (Manager role)
    console.log('📝 Creating Account 2: Approver...');
    const approver = await prisma.users.upsert({
      where: {
        email: "approver@acme.local"
      },
      update: {},
      create: {
        tenant_id: tenant.id,
        email: "approver@acme.local",
        password_hash: hashedPassword,
        full_name: "Trần Thị B (Approver)",
        phone: "0907654321",
        department_id: department?.id,
        status: 'active'
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

    console.log('✅ Approver account created:');
    console.log(`   Email: approver@acme.local`);
    console.log('   Password: supplied through DEMO_ADMIN_PASSWORD');
    console.log(`   Role: Manager`);
    console.log(`   ID: ${approver.id}\n`);

    console.log('🎉 SUCCESS! 2 test accounts created!\n');
    console.log('📋 Test Workflow:');
    console.log('1. Login as creator@acme.local');
    console.log('2. Upload document with workflow');
    console.log('3. Submit for approval');
    console.log('4. Logout');
    console.log('5. Login as approver@acme.local');
    console.log('6. Go to "Phê duyệt của tôi"');
    console.log('7. Approve/Reject document\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createApprovalTestUsers();
