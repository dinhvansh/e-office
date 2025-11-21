/**
 * Final Org Chart seed - Correct schema fields
 * Hierarchy: Tenant → Company → Departments → Users → Positions
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Org Chart seed...\n');

  const tenant = await prisma.tenants.findFirst();
  if (!tenant) {
    console.error('No tenant found. Run seed-rbac.js first.');
    return;
  }

  console.log(`Using tenant: ${tenant.name}\n`);

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Positions
  console.log('Creating positions...');
  const ceoPos = await prisma.positions.upsert({
    where: { tenant_id_code: { tenant_id: tenant.id, code: 'CEO' } },
    update: {},
    create: { tenant_id: tenant.id, code: 'CEO', name: 'Tổng Giám Đốc', level: 1 }
  });

  const dirPos = await prisma.positions.upsert({
    where: { tenant_id_code: { tenant_id: tenant.id, code: 'DIR' } },
    update: {},
    create: { tenant_id: tenant.id, code: 'DIR', name: 'Giám Đốc', level: 2 }
  });

  const staffPos = await prisma.positions.upsert({
    where: { tenant_id_code: { tenant_id: tenant.id, code: 'STAFF' } },
    update: {},
    create: { tenant_id: tenant.id, code: 'STAFF', name: 'Nhân Viên', level: 5 }
  });

  console.log('Created 3 positions\n');

  // Departments
  console.log('Creating departments...');
  
  const company = await prisma.departments.upsert({
    where: { departments_tenant_id_code_key: { tenant_id: tenant.id, code: 'COMPANY' } },
    update: {},
    create: { tenant_id: tenant.id, code: 'COMPANY', name: 'Công ty ACME' }
  });

  const bgd = await prisma.departments.upsert({
    where: { departments_tenant_id_code_key: { tenant_id: tenant.id, code: 'BGD' } },
    update: {},
    create: { tenant_id: tenant.id, code: 'BGD', name: 'Ban Giám Đốc', parent_id: company.id }
  });

  const hr = await prisma.departments.upsert({
    where: { departments_tenant_id_code_key: { tenant_id: tenant.id, code: 'HR' } },
    update: {},
    create: { tenant_id: tenant.id, code: 'HR', name: 'Phòng Nhân Sự', parent_id: bgd.id }
  });

  const it = await prisma.departments.upsert({
    where: { departments_tenant_id_code_key: { tenant_id: tenant.id, code: 'IT' } },
    update: {},
    create: { tenant_id: tenant.id, code: 'IT', name: 'Phòng IT', parent_id: bgd.id }
  });

  const hn = await prisma.departments.upsert({
    where: { departments_tenant_id_code_key: { tenant_id: tenant.id, code: 'HN' } },
    update: {},
    create: { tenant_id: tenant.id, code: 'HN', name: 'Chi nhánh Hà Nội', parent_id: company.id }
  });

  const hcm = await prisma.departments.upsert({
    where: { departments_tenant_id_code_key: { tenant_id: tenant.id, code: 'HCM' } },
    update: {},
    create: { tenant_id: tenant.id, code: 'HCM', name: 'Chi nhánh TP.HCM', parent_id: company.id }
  });

  const salesHN = await prisma.departments.upsert({
    where: { departments_tenant_id_code_key: { tenant_id: tenant.id, code: 'SALES-HN' } },
    update: {},
    create: { tenant_id: tenant.id, code: 'SALES-HN', name: 'Phòng Kinh Doanh HN', parent_id: hn.id }
  });

  const salesHCM = await prisma.departments.upsert({
    where: { departments_tenant_id_code_key: { tenant_id: tenant.id, code: 'SALES-HCM' } },
    update: {},
    create: { tenant_id: tenant.id, code: 'SALES-HCM', name: 'Phòng Kinh Doanh HCM', parent_id: hcm.id }
  });

  const techHN = await prisma.departments.upsert({
    where: { departments_tenant_id_code_key: { tenant_id: tenant.id, code: 'TECH-HN' } },
    update: {},
    create: { tenant_id: tenant.id, code: 'TECH-HN', name: 'Phòng Kỹ Thuật HN', parent_id: hn.id }
  });

  const techHCM = await prisma.departments.upsert({
    where: { departments_tenant_id_code_key: { tenant_id: tenant.id, code: 'TECH-HCM' } },
    update: {},
    create: { tenant_id: tenant.id, code: 'TECH-HCM', name: 'Phòng Kỹ Thuật HCM', parent_id: hcm.id }
  });

  console.log('Created 10 departments (3 levels)\n');

  // Roles
  const adminRole = await prisma.roles.findFirst({ where: { tenant_id: tenant.id, name: 'Admin' } });
  const managerRole = await prisma.roles.findFirst({ where: { tenant_id: tenant.id, name: 'Manager' } });
  const userRole = await prisma.roles.findFirst({ where: { tenant_id: tenant.id, name: 'User' } });

  // Users
  console.log('Creating users...');

  const ceo = await prisma.users.upsert({
    where: { email: 'ceo@acme.local' },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'ceo@acme.local',
      password_hash: hashedPassword,
      full_name: 'Nguyễn Văn CEO',
      department_id: bgd.id,
      position_id: ceoPos.id,
      status: 'active',
    }
  });

  await prisma.user_roles.upsert({
    where: { user_id_role_id: { user_id: ceo.id, role_id: adminRole.id } },
    update: {},
    create: { user_id: ceo.id, role_id: adminRole.id }
  });

  const dirHR = await prisma.users.upsert({
    where: { email: 'dir.hr@acme.local' },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'dir.hr@acme.local',
      password_hash: hashedPassword,
      full_name: 'Trần Thị Hương',
      department_id: hr.id,
      position_id: dirPos.id,
      manager_id: ceo.id,
      status: 'active',
    }
  });

  await prisma.user_roles.upsert({
    where: { user_id_role_id: { user_id: dirHR.id, role_id: managerRole.id } },
    update: {},
    create: { user_id: dirHR.id, role_id: managerRole.id }
  });

  const dirIT = await prisma.users.upsert({
    where: { email: 'dir.it@acme.local' },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'dir.it@acme.local',
      password_hash: hashedPassword,
      full_name: 'Phạm Minh Tuấn',
      department_id: it.id,
      position_id: dirPos.id,
      manager_id: ceo.id,
      status: 'active',
    }
  });

  await prisma.user_roles.upsert({
    where: { user_id_role_id: { user_id: dirIT.id, role_id: managerRole.id } },
    update: {},
    create: { user_id: dirIT.id, role_id: managerRole.id }
  });

  const staffHR = await prisma.users.upsert({
    where: { email: 'staff.hr@acme.local' },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'staff.hr@acme.local',
      password_hash: hashedPassword,
      full_name: 'Nguyễn Thị Mai',
      department_id: hr.id,
      position_id: staffPos.id,
      manager_id: dirHR.id,
      status: 'active',
    }
  });

  await prisma.user_roles.upsert({
    where: { user_id_role_id: { user_id: staffHR.id, role_id: userRole.id } },
    update: {},
    create: { user_id: staffHR.id, role_id: userRole.id }
  });

  const staffIT = await prisma.users.upsert({
    where: { email: 'staff.it@acme.local' },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'staff.it@acme.local',
      password_hash: hashedPassword,
      full_name: 'Lê Minh Khoa',
      department_id: it.id,
      position_id: staffPos.id,
      manager_id: dirIT.id,
      status: 'active',
    }
  });

  await prisma.user_roles.upsert({
    where: { user_id_role_id: { user_id: staffIT.id, role_id: userRole.id } },
    update: {},
    create: { user_id: staffIT.id, role_id: userRole.id }
  });

  // Sales HN
  const salesHNMgr = await prisma.users.upsert({
    where: { email: 'mgr.sales.hn@acme.local' },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'mgr.sales.hn@acme.local',
      password_hash: hashedPassword,
      full_name: 'Hoàng Văn Nam',
      department_id: salesHN.id,
      position_id: dirPos.id,
      manager_id: ceo.id,
      status: 'active',
    }
  });

  await prisma.user_roles.upsert({
    where: { user_id_role_id: { user_id: salesHNMgr.id, role_id: managerRole.id } },
    update: {},
    create: { user_id: salesHNMgr.id, role_id: managerRole.id }
  });

  // Sales HCM
  const salesHCMMgr = await prisma.users.upsert({
    where: { email: 'mgr.sales.hcm@acme.local' },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'mgr.sales.hcm@acme.local',
      password_hash: hashedPassword,
      full_name: 'Võ Thị Lan',
      department_id: salesHCM.id,
      position_id: dirPos.id,
      manager_id: ceo.id,
      status: 'active',
    }
  });

  await prisma.user_roles.upsert({
    where: { user_id_role_id: { user_id: salesHCMMgr.id, role_id: managerRole.id } },
    update: {},
    create: { user_id: salesHCMMgr.id, role_id: managerRole.id }
  });

  // Staff Sales HN
  const staffSalesHN = await prisma.users.upsert({
    where: { email: 'staff.sales.hn@acme.local' },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'staff.sales.hn@acme.local',
      password_hash: hashedPassword,
      full_name: 'Đỗ Văn Hùng',
      department_id: salesHN.id,
      position_id: staffPos.id,
      manager_id: salesHNMgr.id,
      status: 'active',
    }
  });

  await prisma.user_roles.upsert({
    where: { user_id_role_id: { user_id: staffSalesHN.id, role_id: userRole.id } },
    update: {},
    create: { user_id: staffSalesHN.id, role_id: userRole.id }
  });

  // Staff Tech HN
  const staffTechHN = await prisma.users.upsert({
    where: { email: 'staff.tech.hn@acme.local' },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'staff.tech.hn@acme.local',
      password_hash: hashedPassword,
      full_name: 'Bùi Văn Toàn',
      department_id: techHN.id,
      position_id: staffPos.id,
      manager_id: salesHNMgr.id,
      status: 'active',
    }
  });

  await prisma.user_roles.upsert({
    where: { user_id_role_id: { user_id: staffTechHN.id, role_id: userRole.id } },
    update: {},
    create: { user_id: staffTechHN.id, role_id: userRole.id }
  });

  console.log('Created 9 users\n');

  // Update department managers
  await prisma.departments.update({ where: { id: hr.id }, data: { manager_id: dirHR.id } });
  await prisma.departments.update({ where: { id: it.id }, data: { manager_id: dirIT.id } });
  await prisma.departments.update({ where: { id: salesHN.id }, data: { manager_id: salesHNMgr.id } });
  await prisma.departments.update({ where: { id: salesHCM.id }, data: { manager_id: salesHCMMgr.id } });

  console.log('===================');
  console.log('SEED COMPLETE!');
  console.log('===================');
  console.log('Tenant: ' + tenant.name);
  console.log('Positions: 3 (CEO, Director, Staff)');
  console.log('Departments: 10 (3 levels)');
  console.log('  - Level 1: Company (1)');
  console.log('  - Level 2: BGD, HN, HCM (3)');
  console.log('  - Level 3: HR, IT, Sales, Tech (6)');
  console.log('Users: 9 (with hierarchy)');
  console.log('===================\n');
  console.log('Test accounts (password: password123):');
  console.log('  ceo@acme.local (CEO, Admin)');
  console.log('  dir.hr@acme.local (Director HR, Manager)');
  console.log('  dir.it@acme.local (Director IT, Manager)');
  console.log('  mgr.sales.hn@acme.local (Sales Manager HN, Manager)');
  console.log('  mgr.sales.hcm@acme.local (Sales Manager HCM, Manager)');
  console.log('  staff.hr@acme.local (Staff HR, User)');
  console.log('  staff.it@acme.local (Staff IT, User)');
  console.log('  staff.sales.hn@acme.local (Staff Sales HN, User)');
  console.log('  staff.tech.hn@acme.local (Staff Tech HN, User)');
  console.log('\nLogin: http://localhost:3000/login');
}

main()
  .catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
