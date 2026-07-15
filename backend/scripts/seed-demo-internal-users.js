const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const demoUsers = [
  {
    email: 'manager@acme.local',
    full_name: 'Nguyen Van Manager',
    role: 'manager',
    roleName: 'Manager',
    departmentCode: 'IT',
    positionCode: 'TP',
    positionName: 'Truong phong',
    positionLevel: 80,
  },
  {
    email: 'staff.it@acme.local',
    full_name: 'Tran Thi IT',
    role: 'user',
    roleName: 'User',
    departmentCode: 'IT',
    positionCode: 'NV',
    positionName: 'Nhan vien',
    positionLevel: 30,
    managerEmail: 'manager@acme.local',
  },
  {
    email: 'legal@acme.local',
    full_name: 'Le Van Phap Che',
    role: 'user',
    roleName: 'User',
    departmentCode: 'HR',
    positionCode: 'CVCC',
    positionName: 'Chuyen vien cao cap',
    positionLevel: 50,
    managerEmail: 'manager@acme.local',
  },
  {
    email: 'finance@acme.local',
    full_name: 'Pham Thi Tai Chinh',
    role: 'user',
    roleName: 'User',
    departmentCode: 'FIN',
    positionCode: 'KT',
    positionName: 'Ke toan vien',
    positionLevel: 35,
    managerEmail: 'manager@acme.local',
  },
];

async function getTenant() {
  const tenant = await prisma.tenants.findFirst({ where: { domain: 'acme.local' } });
  if (!tenant) throw new Error('Acme tenant not found. Run seed.js first.');
  return tenant;
}

async function upsertDepartment(tenantId, code, name) {
  return prisma.departments.upsert({
    where: { departments_tenant_id_code_key: { tenant_id: tenantId, code } },
    update: { name },
    create: { tenant_id: tenantId, code, name },
  });
}

async function upsertPosition(tenantId, code, name, level) {
  return prisma.positions.upsert({
    where: { tenant_id_code: { tenant_id: tenantId, code } },
    update: { name, level, is_active: true },
    create: { tenant_id: tenantId, code, name, level, is_active: true },
  });
}

async function assignRole(userId, roleId) {
  if (!roleId) return;
  await prisma.user_roles.upsert({
    where: { user_id_role_id: { user_id: userId, role_id: roleId } },
    update: {},
    create: { user_id: userId, role_id: roleId },
  });
}

async function main() {
  const tenant = await getTenant();
  const password = process.env.DEMO_ADMIN_PASSWORD;
  if (!password) throw new Error('DEMO_ADMIN_PASSWORD is required');
  const passwordHash = await bcrypt.hash(password, 10);

  const departments = {
    IT: await upsertDepartment(tenant.id, 'IT', 'Phong IT'),
    HR: await upsertDepartment(tenant.id, 'HR', 'Phong Nhan su'),
    FIN: await upsertDepartment(tenant.id, 'FIN', 'Phong Tai chinh'),
  };

  const roleMap = new Map(
    (await prisma.roles.findMany({ where: { tenant_id: tenant.id } })).map((role) => [role.name, role.id])
  );

  const createdUsers = new Map();

  for (const item of demoUsers) {
    const department = departments[item.departmentCode];
    const position = await upsertPosition(tenant.id, item.positionCode, item.positionName, item.positionLevel);

    const user = await prisma.users.upsert({
      where: { email: item.email },
      update: {
        tenant_id: tenant.id,
        full_name: item.full_name,
        role: item.role,
        status: 'active',
        department_id: department?.id,
        position_id: position.id,
      },
      create: {
        tenant_id: tenant.id,
        email: item.email,
        password_hash: passwordHash,
        full_name: item.full_name,
        role: item.role,
        status: 'active',
        department_id: department?.id,
        position_id: position.id,
      },
    });

    await assignRole(user.id, roleMap.get(item.roleName));
    createdUsers.set(item.email, user);
  }

  for (const item of demoUsers) {
    if (!item.managerEmail) continue;
    const user = createdUsers.get(item.email) || await prisma.users.findUnique({ where: { email: item.email } });
    const manager = createdUsers.get(item.managerEmail) || await prisma.users.findUnique({ where: { email: item.managerEmail } });
    if (user && manager) {
      await prisma.users.update({ where: { id: user.id }, data: { manager_id: manager.id } });
    }
  }

  const manager = createdUsers.get('manager@acme.local');
  if (manager) {
    await prisma.departments.update({ where: { id: departments.IT.id }, data: { manager_id: manager.id } });
  }

  console.log(`Demo internal users seeded: ${demoUsers.map((user) => user.email).join(', ')}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
