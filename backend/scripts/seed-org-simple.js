/**
 * Simple seed for Org Chart testing
 * Hierarchy: Tenant → Company → Departments → Users → Positions
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Org Chart seed...\n');

  // Get tenant
  const tenant = await prisma.tenants.findFirst();
  if (!tenant) {
    console.error('No tenant found. Run seed-rbac.js first.');
    return;
  }

  console.log(`Using tenant: ${tenant.name}\n`);

  const password = process.env.DEMO_ADMIN_PASSWORD;
  if (!password) throw new Error('DEMO_ADMIN_PASSWORD is required');
  const hashedPassword = await bcrypt.hash(password, 10);

  // Get or create positions
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

  const mgrPos = await prisma.positions.upsert({
    where: { tenant_id_code: { tenant_id: tenant.id, code: 'MGR' } },
    update: {},
    create: { tenant_id: tenant.id, code: 'MGR', name: 'Trưởng Phòng', level: 3 }
  });

  const staffPos = await prisma.positions.upsert({
    where: { tenant_id_code: { tenant_id: tenant.id, code: 'STAFF' } },
    update: {},
    create: { tenant_id: tenant.id, code: 'STAFF', name: 'Nhân Viên', level: 5 }
  });

  console.log('Created 4 positions\n');

  // Create departments
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

  const fin = await prisma.departments.upsert({
    where: { departments_tenant_id_code_key: { tenant_id: tenant.id, code: 'FIN' } },
    update: {},
    create: { tenant_id: tenant.id, code: 'FIN', name: 'Phòng Kế Toán', parent_id: bgd.id }
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

  const salesHN = await prisma.departments.upsert({
    where: { departments_tenant_id_code_key: { tenant_id: tenant.id, code: 'SALES-HN' } },
    update: {},
    create: { tenant_id: tenant.id, code: 'SALES-HN', name: 'Phòng Kinh Doanh HN', parent_id: hn.id }
  });

  console.log('Created 7 departments\n');

  // Get roles
  const adminRole = await prisma.roles.findFirst({ where: { tenant_id: tenant.id, name: 'Admin' } });
  const managerRole = await prisma.roles.findFirst({ where: { tenant_id: tenant.id, name: 'Manager' } });
  const userRole = await prisma.roles.findFirst({ where: { tenant_id: tenant.id, name: 'User' } });

  // Create users
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
    where: { email: 'dir.hr@acme.local' } },
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
    where: { email: 'dir.it@acme.local' } },
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
    where: { email: 'staff.hr@acme.local' } },
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
    where: { email: 'staff.it@acme.local' } },
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

  console.log('Created 5 users\n');

  // Update department managers
  await prisma.departments.update({ where: { id: hr.id }, data: { manager_id: dirHR.id } });
  await prisma.departments.update({ where: { id: it.id }, data: { manager_id: dirIT.id } });

  console.log('SUMMARY');
  console.log('===================');
  console.log('Tenant: ' + tenant.name);
  console.log('Positions: 4');
  console.log('Departments: 7 (3 levels)');
  console.log('Users: 5');
  console.log('===================\n');
  console.log('Test accounts:');
  console.log('  Passwords are supplied through DEMO_ADMIN_PASSWORD');
  console.log('\nLogin: http://localhost:3000/login');
}

main()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());


