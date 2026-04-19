const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedRBAC() {
  console.log('Seeding RBAC system...');

  const tenant = await prisma.tenants.findFirst();
  if (!tenant) {
    console.log('No tenant found. Run seed.js first.');
    return;
  }

  const permissions = [
    { resource: 'users', action: 'create', description: 'Create new users' },
    { resource: 'users', action: 'read', description: 'View user information' },
    { resource: 'users', action: 'update', description: 'Update user information' },
    { resource: 'users', action: 'delete', description: 'Delete users' },
    { resource: 'users', action: 'manage_roles', description: 'Assign roles to users' },

    { resource: 'departments', action: 'create', description: 'Create departments' },
    { resource: 'departments', action: 'read', description: 'View departments' },
    { resource: 'departments', action: 'update', description: 'Update departments' },
    { resource: 'departments', action: 'delete', description: 'Delete departments' },

    { resource: 'documents', action: 'create', description: 'Upload documents' },
    { resource: 'documents', action: 'read', description: 'View documents' },
    { resource: 'documents', action: 'update', description: 'Update documents' },
    { resource: 'documents', action: 'delete', description: 'Delete documents' },
    { resource: 'documents', action: 'share', description: 'Share documents' },

    { resource: 'sign_requests', action: 'create', description: 'Create sign requests' },
    { resource: 'sign_requests', action: 'read', description: 'View sign requests' },
    { resource: 'sign_requests', action: 'update', description: 'Update sign requests' },
    { resource: 'sign_requests', action: 'delete', description: 'Delete sign requests' },
    { resource: 'sign_requests', action: 'approve', description: 'Approve sign requests' },

    { resource: 'workflows', action: 'create', description: 'Create workflows' },
    { resource: 'workflows', action: 'read', description: 'View workflows' },
    { resource: 'workflows', action: 'update', description: 'Update workflows' },
    { resource: 'workflows', action: 'delete', description: 'Delete workflows' },

    { resource: 'approvals', action: 'create', description: 'Create approvals' },
    { resource: 'approvals', action: 'read', description: 'View approvals' },
    { resource: 'approvals', action: 'update', description: 'Update approvals' },
    { resource: 'approvals', action: 'delete', description: 'Delete approvals' },

    { resource: 'positions', action: 'create', description: 'Create positions' },
    { resource: 'positions', action: 'read', description: 'View positions' },
    { resource: 'positions', action: 'update', description: 'Update positions' },
    { resource: 'positions', action: 'delete', description: 'Delete positions' },

    { resource: 'external_orgs', action: 'create', description: 'Create external organizations' },
    { resource: 'external_orgs', action: 'read', description: 'View external organizations' },
    { resource: 'external_orgs', action: 'update', description: 'Update external organizations' },
    { resource: 'external_orgs', action: 'delete', description: 'Delete external organizations' },

    { resource: 'webhooks', action: 'create', description: 'Create webhooks' },
    { resource: 'webhooks', action: 'read', description: 'View webhooks' },
    { resource: 'webhooks', action: 'update', description: 'Update webhooks' },
    { resource: 'webhooks', action: 'delete', description: 'Delete webhooks' },

    { resource: 'roles', action: 'create', description: 'Create custom roles' },
    { resource: 'roles', action: 'read', description: 'View roles' },
    { resource: 'roles', action: 'update', description: 'Update roles' },
    { resource: 'roles', action: 'delete', description: 'Delete roles' },

    { resource: 'audit_logs', action: 'read', description: 'View audit logs' },
    { resource: 'audit_logs', action: 'export', description: 'Export audit logs' },

    { resource: 'settings', action: 'read', description: 'View settings' },
    { resource: 'settings', action: 'update', description: 'Update settings' },
    { resource: 'settings', action: 'manage', description: 'Manage system settings' },
  ];

  console.log('Creating permissions...');
  for (const permission of permissions) {
    await prisma.permissions.upsert({
      where: {
        resource_action: {
          resource: permission.resource,
          action: permission.action,
        },
      },
      update: { description: permission.description },
      create: permission,
    });
  }

  const allPermissions = await prisma.permissions.findMany();

  const adminRole = await prisma.roles.upsert({
    where: { tenant_id_name: { tenant_id: tenant.id, name: 'Admin' } },
    update: {
      description: 'Full system access',
      is_system: true,
    },
    create: {
      tenant_id: tenant.id,
      name: 'Admin',
      description: 'Full system access',
      is_system: true,
    },
  });

  await prisma.role_permissions.deleteMany({ where: { role_id: adminRole.id } });
  await prisma.role_permissions.createMany({
    data: allPermissions.map((permission) => ({
      role_id: adminRole.id,
      permission_id: permission.id,
    })),
  });

  const managerRole = await prisma.roles.upsert({
    where: { tenant_id_name: { tenant_id: tenant.id, name: 'Manager' } },
    update: {
      description: 'Manage documents, workflows, and approvals',
      is_system: true,
    },
    create: {
      tenant_id: tenant.id,
      name: 'Manager',
      description: 'Manage documents, workflows, and approvals',
      is_system: true,
    },
  });

  const managerPermissions = allPermissions.filter(
    (permission) =>
      ['documents', 'sign_requests', 'users', 'approvals', 'workflows'].includes(permission.resource) &&
      ['create', 'read', 'update', 'approve'].includes(permission.action)
  );
  await prisma.role_permissions.deleteMany({ where: { role_id: managerRole.id } });
  await prisma.role_permissions.createMany({
    data: managerPermissions.map((permission) => ({
      role_id: managerRole.id,
      permission_id: permission.id,
    })),
  });

  const userRole = await prisma.roles.upsert({
    where: { tenant_id_name: { tenant_id: tenant.id, name: 'User' } },
    update: {
      description: 'Basic document and approval operations',
      is_system: true,
    },
    create: {
      tenant_id: tenant.id,
      name: 'User',
      description: 'Basic document and approval operations',
      is_system: true,
    },
  });

  const userPermissions = allPermissions.filter(
    (permission) =>
      ['documents', 'sign_requests', 'approvals'].includes(permission.resource) &&
      ['create', 'read'].includes(permission.action)
  );
  await prisma.role_permissions.deleteMany({ where: { role_id: userRole.id } });
  await prisma.role_permissions.createMany({
    data: userPermissions.map((permission) => ({
      role_id: userRole.id,
      permission_id: permission.id,
    })),
  });

  const viewerRole = await prisma.roles.upsert({
    where: { tenant_id_name: { tenant_id: tenant.id, name: 'Viewer' } },
    update: {
      description: 'Read-only access',
      is_system: true,
    },
    create: {
      tenant_id: tenant.id,
      name: 'Viewer',
      description: 'Read-only access',
      is_system: true,
    },
  });

  const viewerPermissions = allPermissions.filter((permission) => permission.action === 'read');
  await prisma.role_permissions.deleteMany({ where: { role_id: viewerRole.id } });
  await prisma.role_permissions.createMany({
    data: viewerPermissions.map((permission) => ({
      role_id: viewerRole.id,
      permission_id: permission.id,
    })),
  });

  const hrDept = await prisma.departments.upsert({
    where: {
      departments_tenant_id_code_key: {
        tenant_id: tenant.id,
        code: 'HR',
      },
    },
    update: {
      name: 'Phong Nhan su',
      description: 'Quan ly nhan su va tuyen dung',
    },
    create: {
      tenant_id: tenant.id,
      code: 'HR',
      name: 'Phong Nhan su',
      description: 'Quan ly nhan su va tuyen dung',
    },
  });

  const itDept = await prisma.departments.upsert({
    where: {
      departments_tenant_id_code_key: {
        tenant_id: tenant.id,
        code: 'IT',
      },
    },
    update: {
      name: 'Phong IT',
      description: 'Cong nghe thong tin',
    },
    create: {
      tenant_id: tenant.id,
      code: 'IT',
      name: 'Phong IT',
      description: 'Cong nghe thong tin',
    },
  });

  await prisma.departments.upsert({
    where: {
      departments_tenant_id_code_key: {
        tenant_id: tenant.id,
        code: 'SALE',
      },
    },
    update: {
      name: 'Phong Kinh doanh',
      description: 'Ban hang va cham soc khach hang',
    },
    create: {
      tenant_id: tenant.id,
      code: 'SALE',
      name: 'Phong Kinh doanh',
      description: 'Ban hang va cham soc khach hang',
    },
  });

  const adminUser = await prisma.users.findFirst({
    where: { email: 'admin@acme.local' },
  });

  if (adminUser) {
    await prisma.user_roles.upsert({
      where: {
        user_id_role_id: {
          user_id: adminUser.id,
          role_id: adminRole.id,
        },
      },
      update: {},
      create: {
        user_id: adminUser.id,
        role_id: adminRole.id,
      },
    });

    await prisma.users.update({
      where: { id: adminUser.id },
      data: {
        full_name: 'Admin User',
        role: 'super_admin',
        department_id: itDept.id || hrDept.id,
      },
    });
  }

  const tenantUsers = await prisma.users.findMany({
    where: { tenant_id: tenant.id },
    include: {
      managed_departments: {
        select: { id: true },
      },
      direct_reports: {
        select: { id: true },
      },
      user_roles: {
        select: { role_id: true },
      },
    },
  });

  for (const user of tenantUsers) {
    const existingRoleIds = new Set(user.user_roles.map((item) => item.role_id));
    const isAdminLike =
      user.id === adminUser?.id ||
      user.role === 'super_admin' ||
      user.role === 'admin';
    const isManagerLike =
      user.role === 'manager' ||
      user.managed_departments.length > 0 ||
      user.direct_reports.length > 0;

    if (isAdminLike && !existingRoleIds.has(adminRole.id)) {
      await prisma.user_roles.upsert({
        where: {
          user_id_role_id: {
            user_id: user.id,
            role_id: adminRole.id,
          },
        },
        update: {},
        create: {
          user_id: user.id,
          role_id: adminRole.id,
        },
      });
      continue;
    }

    if (isManagerLike && !existingRoleIds.has(managerRole.id)) {
      await prisma.user_roles.upsert({
        where: {
          user_id_role_id: {
            user_id: user.id,
            role_id: managerRole.id,
          },
        },
        update: {},
        create: {
          user_id: user.id,
          role_id: managerRole.id,
        },
      });
      continue;
    }

    if (!existingRoleIds.has(userRole.id)) {
      await prisma.user_roles.upsert({
        where: {
          user_id_role_id: {
            user_id: user.id,
            role_id: userRole.id,
          },
        },
        update: {},
        create: {
          user_id: user.id,
          role_id: userRole.id,
        },
      });
    }
  }

  console.log('RBAC system seeded successfully.');
  console.log(`  - ${allPermissions.length} permissions`);
  console.log('  - 4 default roles (Admin, Manager, User, Viewer)');
  console.log('  - 3 sample departments');
}

seedRBAC()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
