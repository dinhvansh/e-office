/**
 * Seed script for testing Org Chart with full organizational structure
 * 
 * Hierarchy:
 * 1. Tenant (ACME Corporation) - Multi-tenant isolation
 * 2. Company (Công ty ACME) - Root organization
 * 3. Departments (Phòng ban) - Hierarchical structure
 *    - Ban Giám Đốc
 *      - Phòng Nhân Sự (HR)
 *      - Phòng Kế Toán (Finance)
 *      - Phòng IT
 *    - Chi nhánh Hà Nội
 *      - Phòng Kinh Doanh HN
 *      - Phòng Kỹ Thuật HN
 *    - Chi nhánh TP.HCM
 *      - Phòng Kinh Doanh HCM
 *      - Phòng Kỹ Thuật HCM
 * 4. Users (Người dùng) - Belong to departments
 * 5. Positions (Vị trí/Chức danh) - Assigned to users
 * 
 * Documents: With different visibility scopes and permissions
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Org Chart seed...\n');

  // Get tenant (try multiple names)
  let tenant = await prisma.tenants.findFirst({
    where: { 
      OR: [
        { name: 'ACME Corporation' },
        { name: 'Acme Corp' },
        { name: { contains: 'Acme' } }
      ]
    }
  });

  if (!tenant) {
    console.error('❌ Tenant not found. Please run seed-rbac.js first.');
    console.log('   Available tenants:');
    const tenants = await prisma.tenants.findMany();
    tenants.forEach(t => console.log(`   - ${t.name} (ID: ${t.id})`));
    return;
  }

  console.log(`✅ Using tenant: ${tenant.name} (ID: ${tenant.id})\n`);

  // ==================== POSITIONS ====================
  console.log('📋 Creating positions...');
  
  const positions = await Promise.all([
    prisma.positions.upsert({
      where: { departments_tenant_id_code_key: { tenant_id: tenant.id, code: 'CEO' } },
      update: {},
      create: {
        tenant_id: tenant.id,
        code: 'CEO',
        name: 'Tổng Giám Đốc',
        description: 'Người đứng đầu công ty',
        level: 1,
        is_active: true,
      }
    }),
    prisma.positions.upsert({
      where: { departments_tenant_id_code_key: { tenant_id: tenant.id, code: 'DIR' } },
      update: {},
      create: {
        tenant_id: tenant.id,
        code: 'DIR',
        name: 'Giám Đốc',
        description: 'Giám đốc phòng ban',
        level: 2,
        is_active: true,
      }
    }),
    prisma.positions.upsert({
      where: { departments_tenant_id_code_key: { tenant_id: tenant.id, code: 'MGR' } },
      update: {},
      create: {
        tenant_id: tenant.id,
        code: 'MGR',
        name: 'Trưởng Phòng',
        description: 'Quản lý phòng ban',
        level: 3,
        is_active: true,
      }
    }),
    prisma.positions.upsert({
      where: { departments_tenant_id_code_key: { tenant_id: tenant.id, code: 'LEAD' } },
      update: {},
      create: {
        tenant_id: tenant.id,
        code: 'LEAD',
        name: 'Trưởng Nhóm',
        description: 'Trưởng nhóm/team lead',
        level: 4,
        is_active: true,
      }
    }),
    prisma.positions.upsert({
      where: { departments_tenant_id_code_key: { tenant_id: tenant.id, code: 'STAFF' } },
      update: {},
      create: {
        tenant_id: tenant.id,
        code: 'STAFF',
        name: 'Nhân Viên',
        description: 'Nhân viên thực hiện',
        level: 5,
        is_active: true,
      }
    }),
  ]);

  console.log(`✅ Created ${positions.length} positions\n`);

  // ==================== DEPARTMENTS ====================
  console.log('🏢 Creating department hierarchy...');
  console.log('   Tenant → Company → Departments → Users\n');

  // Level 1: Company (Root department representing the company)
  const company = await prisma.departments.upsert({
    where: { departments_tenant_id_code_key: { tenant_id: tenant.id, code: 'COMPANY' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      code: 'COMPANY',
      name: 'Công ty ACME',
      description: 'Công ty cổ phần ACME - Root organization',
      is_active: true,
    }
  });

  // Level 2: Divisions
  const banGiamDoc = await prisma.departments.upsert({
    where: { departments_tenant_id_code_key: { tenant_id: tenant.id, code: 'BGD' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      code: 'BGD',
      name: 'Ban Giám Đốc',
      description: 'Ban lãnh đạo công ty',
      parent_id: company.id,
      is_active: true,
    }
  });

  const chiNhanhHN = await prisma.departments.upsert({
    where: { departments_tenant_id_code_key: { tenant_id: tenant.id, code: 'HN' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      code: 'HN',
      name: 'Chi nhánh Hà Nội',
      description: 'Chi nhánh miền Bắc',
      parent_id: company.id,
      is_active: true,
    }
  });

  const chiNhanhHCM = await prisma.departments.upsert({
    where: { departments_tenant_id_code_key: { tenant_id: tenant.id, code: 'HCM' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      code: 'HCM',
      name: 'Chi nhánh TP.HCM',
      description: 'Chi nhánh miền Nam',
      parent_id: company.id,
      is_active: true,
    }
  });

  // Level 3: Departments under BGD
  const phongNhanSu = await prisma.departments.upsert({
    where: { departments_tenant_id_code_key: { tenant_id: tenant.id, code: 'HR' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      code: 'HR',
      name: 'Phòng Nhân Sự',
      description: 'Quản lý nhân sự và tuyển dụng',
      parent_id: banGiamDoc.id,
      is_active: true,
    }
  });

  const phongKeToan = await prisma.departments.upsert({
    where: { departments_tenant_id_code_key: { tenant_id: tenant.id, code: 'FIN' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      code: 'FIN',
      name: 'Phòng Kế Toán',
      description: 'Quản lý tài chính và kế toán',
      parent_id: banGiamDoc.id,
      is_active: true,
    }
  });

  const phongIT = await prisma.departments.upsert({
    where: { departments_tenant_id_code_key: { tenant_id: tenant.id, code: 'IT' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      code: 'IT',
      name: 'Phòng IT',
      description: 'Công nghệ thông tin',
      parent_id: banGiamDoc.id,
      is_active: true,
    }
  });

  // Level 3: Departments under HN
  const phongKDHN = await prisma.departments.upsert({
    where: { departments_tenant_id_code_key: { tenant_id: tenant.id, code: 'SALES-HN' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      code: 'SALES-HN',
      name: 'Phòng Kinh Doanh HN',
      description: 'Kinh doanh khu vực Hà Nội',
      parent_id: chiNhanhHN.id,
      is_active: true,
    }
  });

  const phongKTHN = await prisma.departments.upsert({
    where: { departments_tenant_id_code_key: { tenant_id: tenant.id, code: 'TECH-HN' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      code: 'TECH-HN',
      name: 'Phòng Kỹ Thuật HN',
      description: 'Kỹ thuật khu vực Hà Nội',
      parent_id: chiNhanhHN.id,
      is_active: true,
    }
  });

  // Level 3: Departments under HCM
  const phongKDHCM = await prisma.departments.upsert({
    where: { departments_tenant_id_code_key: { tenant_id: tenant.id, code: 'SALES-HCM' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      code: 'SALES-HCM',
      name: 'Phòng Kinh Doanh HCM',
      description: 'Kinh doanh khu vực TP.HCM',
      parent_id: chiNhanhHCM.id,
      is_active: true,
    }
  });

  const phongKTHCM = await prisma.departments.upsert({
    where: { departments_tenant_id_code_key: { tenant_id: tenant.id, code: 'TECH-HCM' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      code: 'TECH-HCM',
      name: 'Phòng Kỹ Thuật HCM',
      description: 'Kỹ thuật khu vực TP.HCM',
      parent_id: chiNhanhHCM.id,
      is_active: true,
    }
  });

  console.log('✅ Created 10 departments in hierarchy\n');

  // ==================== ROLES ====================
  console.log('👥 Getting roles...');
  
  const adminRole = await prisma.roles.findFirst({
    where: { tenant_id: tenant.id, name: 'Admin' }
  });

  const managerRole = await prisma.roles.findFirst({
    where: { tenant_id: tenant.id, name: 'Manager' }
  });

  const userRole = await prisma.roles.findFirst({
    where: { tenant_id: tenant.id, name: 'User' }
  });

  console.log('✅ Found roles\n');

  // ==================== USERS ====================
  console.log('👤 Creating users...');

  const password = process.env.DEMO_ADMIN_PASSWORD;
  if (!password) throw new Error('DEMO_ADMIN_PASSWORD is required');
  const hashedPassword = await bcrypt.hash(password, 10);

  // CEO
  const ceo = await prisma.users.upsert({
    where: { tenant_id_email: { tenant_id: tenant.id, email: 'ceo@acme.local' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'ceo@acme.local',
      password: hashedPassword,
      full_name: 'Nguyễn Văn CEO',
      phone: '0901000001',
      department_id: banGiamDoc.id,
      position_id: positions[0].id, // CEO
      is_active: true,
    }
  });

  // Assign Admin role to CEO
  await prisma.user_roles.upsert({
    where: {
      user_id_role_id: { user_id: ceo.id, role_id: adminRole.id }
    },
    update: {},
    create: { user_id: ceo.id, role_id: adminRole.id }
  });

  // Directors
  const dirHR = await prisma.users.upsert({
    where: { tenant_id_email: { tenant_id: tenant.id, email: 'dir.hr@acme.local' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'dir.hr@acme.local',
      password: hashedPassword,
      full_name: 'Trần Thị Hương',
      phone: '0901000002',
      department_id: phongNhanSu.id,
      position_id: positions[1].id, // Director
      manager_id: ceo.id,
      is_active: true,
    }
  });

  const dirFin = await prisma.users.upsert({
    where: { tenant_id_email: { tenant_id: tenant.id, email: 'dir.fin@acme.local' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'dir.fin@acme.local',
      password: hashedPassword,
      full_name: 'Lê Văn Tài',
      phone: '0901000003',
      department_id: phongKeToan.id,
      position_id: positions[1].id, // Director
      manager_id: ceo.id,
      is_active: true,
    }
  });

  const dirIT = await prisma.users.upsert({
    where: { tenant_id_email: { tenant_id: tenant.id, email: 'dir.it@acme.local' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'dir.it@acme.local',
      password: hashedPassword,
      full_name: 'Phạm Minh Tuấn',
      phone: '0901000004',
      department_id: phongIT.id,
      position_id: positions[1].id, // Director
      manager_id: ceo.id,
      is_active: true,
    }
  });

  // Assign Manager role to Directors
  for (const dir of [dirHR, dirFin, dirIT]) {
    await prisma.user_roles.upsert({
      where: { user_id_role_id: { user_id: dir.id, role_id: managerRole.id } },
      update: {},
      create: { user_id: dir.id, role_id: managerRole.id }
    });
  }

  // Managers
  const mgrSalesHN = await prisma.users.upsert({
    where: { tenant_id_email: { tenant_id: tenant.id, email: 'mgr.sales.hn@acme.local' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'mgr.sales.hn@acme.local',
      password: hashedPassword,
      full_name: 'Hoàng Văn Nam',
      phone: '0901000005',
      department_id: phongKDHN.id,
      position_id: positions[2].id, // Manager
      manager_id: ceo.id,
      is_active: true,
    }
  });

  const mgrSalesHCM = await prisma.users.upsert({
    where: { tenant_id_email: { tenant_id: tenant.id, email: 'mgr.sales.hcm@acme.local' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'mgr.sales.hcm@acme.local',
      password: hashedPassword,
      full_name: 'Võ Thị Lan',
      phone: '0901000006',
      department_id: phongKDHCM.id,
      position_id: positions[2].id, // Manager
      manager_id: ceo.id,
      is_active: true,
    }
  });

  // Assign Manager role
  for (const mgr of [mgrSalesHN, mgrSalesHCM]) {
    await prisma.user_roles.upsert({
      where: { user_id_role_id: { user_id: mgr.id, role_id: managerRole.id } },
      update: {},
      create: { user_id: mgr.id, role_id: managerRole.id }
    });
  }

  // Staff
  const staffHR1 = await prisma.users.upsert({
    where: { tenant_id_email: { tenant_id: tenant.id, email: 'staff.hr1@acme.local' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'staff.hr1@acme.local',
      password: hashedPassword,
      full_name: 'Nguyễn Thị Mai',
      phone: '0901000007',
      department_id: phongNhanSu.id,
      position_id: positions[4].id, // Staff
      manager_id: dirHR.id,
      is_active: true,
    }
  });

  const staffHR2 = await prisma.users.upsert({
    where: { tenant_id_email: { tenant_id: tenant.id, email: 'staff.hr2@acme.local' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'staff.hr2@acme.local',
      password: hashedPassword,
      full_name: 'Trần Văn Bình',
      phone: '0901000008',
      department_id: phongNhanSu.id,
      position_id: positions[4].id, // Staff
      manager_id: dirHR.id,
      is_active: true,
    }
  });

  const staffIT1 = await prisma.users.upsert({
    where: { tenant_id_email: { tenant_id: tenant.id, email: 'staff.it1@acme.local' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'staff.it1@acme.local',
      password: hashedPassword,
      full_name: 'Lê Minh Khoa',
      phone: '0901000009',
      department_id: phongIT.id,
      position_id: positions[4].id, // Staff
      manager_id: dirIT.id,
      is_active: true,
    }
  });

  const staffSalesHN1 = await prisma.users.upsert({
    where: { tenant_id_email: { tenant_id: tenant.id, email: 'staff.sales.hn1@acme.local' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'staff.sales.hn1@acme.local',
      password: hashedPassword,
      full_name: 'Đỗ Văn Hùng',
      phone: '0901000010',
      department_id: phongKDHN.id,
      position_id: positions[4].id, // Staff
      manager_id: mgrSalesHN.id,
      is_active: true,
    }
  });

  // Assign User role to staff
  for (const staff of [staffHR1, staffHR2, staffIT1, staffSalesHN1]) {
    await prisma.user_roles.upsert({
      where: { user_id_role_id: { user_id: staff.id, role_id: userRole.id } },
      update: {},
      create: { user_id: staff.id, role_id: userRole.id }
    });
  }

  console.log('✅ Created 11 users with positions and managers\n');

  // Update department managers
  await prisma.departments.update({
    where: { id: phongNhanSu.id },
    data: { manager_id: dirHR.id }
  });

  await prisma.departments.update({
    where: { id: phongKeToan.id },
    data: { manager_id: dirFin.id }
  });

  await prisma.departments.update({
    where: { id: phongIT.id },
    data: { manager_id: dirIT.id }
  });

  await prisma.departments.update({
    where: { id: phongKDHN.id },
    data: { manager_id: mgrSalesHN.id }
  });

  await prisma.departments.update({
    where: { id: phongKDHCM.id },
    data: { manager_id: mgrSalesHCM.id }
  });

  console.log('✅ Updated department managers\n');

  // ==================== DOCUMENTS ====================
  console.log('📄 Creating test documents...');

  // Get document type
  const docType = await prisma.document_types.findFirst({
    where: { tenant_id: tenant.id }
  });

  if (!docType) {
    console.log('⚠️  No document type found, skipping documents');
  } else {
    // Public document (everyone can see)
    await prisma.documents.create({
      data: {
        tenant_id: tenant.id,
        owner_id: ceo.id,
        document_type_id: docType.id,
        file_path: 'uploads/test/company-policy.pdf',
        original_file_name: 'company-policy.pdf',
        title: 'Quy định nội bộ công ty',
        summary: 'Quy định chung cho toàn công ty',
        status: 'active',
        visibility_scope: 'public',
        confidential_level: 'normal',
        priority_level: 'high',
      }
    });

    // Department document (only HR can see)
    await prisma.documents.create({
      data: {
        tenant_id: tenant.id,
        owner_id: dirHR.id,
        document_type_id: docType.id,
        file_path: 'uploads/test/hr-handbook.pdf',
        original_file_name: 'hr-handbook.pdf',
        title: 'Sổ tay nhân sự',
        summary: 'Tài liệu nội bộ phòng Nhân sự',
        status: 'active',
        visibility_scope: 'department',
        confidential_level: 'confidential',
        priority_level: 'normal',
      }
    });

    // Private document (only owner can see)
    await prisma.documents.create({
      data: {
        tenant_id: tenant.id,
        owner_id: dirFin.id,
        document_type_id: docType.id,
        file_path: 'uploads/test/financial-report.pdf',
        original_file_name: 'financial-report.pdf',
        title: 'Báo cáo tài chính Q4',
        summary: 'Báo cáo tài chính mật',
        status: 'active',
        visibility_scope: 'private',
        confidential_level: 'secret',
        priority_level: 'high',
      }
    });

    // Draft document
    await prisma.documents.create({
      data: {
        tenant_id: tenant.id,
        owner_id: staffIT1.id,
        document_type_id: docType.id,
        file_path: 'uploads/test/it-proposal.pdf',
        original_file_name: 'it-proposal.pdf',
        title: 'Đề xuất nâng cấp hệ thống',
        summary: 'Đề xuất nâng cấp server',
        status: 'draft',
        visibility_scope: 'department',
        confidential_level: 'normal',
        priority_level: 'normal',
      }
    });

    console.log('✅ Created 4 test documents with different visibility\n');
  }

  // ==================== SUMMARY ====================
  console.log('\n📊 SEED SUMMARY');
  console.log('=====================================');
  console.log('🏢 ORGANIZATIONAL STRUCTURE:');
  console.log('   1. Tenant: ACME Corporation (Multi-tenant)');
  console.log('   2. Company: Công ty ACME (Root)');
  console.log('   3. Departments: 10 (3-level hierarchy)');
  console.log('      - Level 1: Company (1)');
  console.log('      - Level 2: Divisions (3)');
  console.log('      - Level 3: Departments (6)');
  console.log('   4. Users: 11 (assigned to departments)');
  console.log('   5. Positions: 5 (assigned to users)');
  console.log('');
  console.log('👥 USERS BY POSITION:');
  console.log('   - CEO: 1');
  console.log('   - Directors: 3');
  console.log('   - Managers: 2');
  console.log('   - Staff: 5');
  console.log('');
  console.log('📄 DOCUMENTS:');
  console.log('   - Public: 1 (everyone can see)');
  console.log('   - Department: 2 (department only)');
  console.log('   - Private: 1 (owner only)');
  console.log('=====================================\n');

  console.log('🎉 Org Chart seed completed!\n');
  console.log('📝 Test credentials:');
  console.log('   Passwords are supplied through DEMO_ADMIN_PASSWORD');
  console.log('\n🌐 Login at: http://localhost:3000/login');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

