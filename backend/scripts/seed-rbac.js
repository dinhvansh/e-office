const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedRBAC() {
  console.log('🌱 Seeding RBAC system...');

  // Get first tenant
  const tenant = await prisma.tenants.findFirst();
  if (!tenant) {
    console.log('❌ No tenant found. Run seed.js first.');
    return;
  }

  // Create permissions
  const permissions = [
    // User management
    { resource: 'users', action: 'create', description: 'Create new users' },
    { resource: 'users', action: 'read', description: 'View user information' },
    { resource: 'users', action: 'update', description: 'Update user information' },
    { resource: 'users', action: 'delete', description: 'Delete users' },
    { resource: 'users', action: 'manage_roles', description: 'Assign roles to users' },
    
    // Department management
    { resource: 'departments', action: 'create', description: 'Create departments' },
    { resource: 'departments', action: 'read', description: 'View departments' },
    { resource: 'departments', action: 'update', description: 'Update departments' },
    { resource: 'departments', action: 'delete', description: 'Delete departments' },
    
    // Document management
    { resource: 'documents', action: 'create', description: 'Upload documents' },
    { resource: 'documents', action: 'read', description: 'View documents' },
    { resource: 'documents', action: 'update', description: 'Update documents' },
    { resource: 'documents', action: 'delete', description: 'Delete documents' },
    { resource: 'documents', action: 'share', description: 'Share documents' },
    
    // Sign request management
    { resource: 'sign_requests', action: 'create', description: 'Create sign requests' },
    { resource: 'sign_requests', action: 'read', description: 'View sign requests' },
    { resource: 'sign_requests', action: 'update', description: 'Update sign requests' },
    { resource: 'sign_requests', action: 'delete', description: 'Delete sign requests' },
    { resource: 'sign_requests', action: 'approve', description: 'Approve sign requests' },
    
    // Role management
    { resource: 'roles', action: 'create', description: 'Create custom roles' },
    { resource: 'roles', action: 'read', description: 'View roles' },
    { resource: 'roles', action: 'update', description: 'Update roles' },
    { resource: 'roles', action: 'delete', description: 'Delete roles' },
    
    // Audit logs
    { resource: 'audit_logs', action: 'read', description: 'View audit logs' },
    { resource: 'audit_logs', action: 'export', description: 'Export audit logs' },
    
    // Settings
    { resource: 'settings', action: 'read', description: 'View settings' },
    { resource: 'settings', action: 'update', description: 'Update settings' },
    { resource: 'settings', action: 'manage', description: 'Manage system settings' },
  ];

  console.log('Creating permissions...');
  for (const perm of permissions) {
    await prisma.permissions.upsert({
      where: { resource_action: { resource: perm.resource, action: perm.action } },
      update: {},
      create: perm,
    });
  }

  // Create default roles
  const allPermissions = await prisma.permissions.findMany();
  
  // Admin role - all permissions
  const adminRole = await prisma.roles.upsert({
    where: { tenant_id_name: { tenant_id: tenant.id, name: 'Admin' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      name: 'Admin',
      description: 'Full system access',
      is_system: true,
    },
  });

  await prisma.role_permissions.deleteMany({ where: { role_id: adminRole.id } });
  await prisma.role_permissions.createMany({
    data: allPermissions.map(p => ({ role_id: adminRole.id, permission_id: p.id })),
  });

  // Manager role - manage documents and sign requests
  const managerRole = await prisma.roles.upsert({
    where: { tenant_id_name: { tenant_id: tenant.id, name: 'Manager' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      name: 'Manager',
      description: 'Manage documents and sign requests',
      is_system: true,
    },
  });

  const managerPermissions = allPermissions.filter(p => 
    ['documents', 'sign_requests', 'users'].includes(p.resource) && 
    ['create', 'read', 'update', 'approve'].includes(p.action)
  );
  await prisma.role_permissions.deleteMany({ where: { role_id: managerRole.id } });
  await prisma.role_permissions.createMany({
    data: managerPermissions.map(p => ({ role_id: managerRole.id, permission_id: p.id })),
  });

  // User role - basic document operations
  const userRole = await prisma.roles.upsert({
    where: { tenant_id_name: { tenant_id: tenant.id, name: 'User' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      name: 'User',
      description: 'Basic document operations',
      is_system: true,
    },
  });

  const userPermissions = allPermissions.filter(p => 
    ['documents', 'sign_requests'].includes(p.resource) && 
    ['create', 'read'].includes(p.action)
  );
  await prisma.role_permissions.deleteMany({ where: { role_id: userRole.id } });
  await prisma.role_permissions.createMany({
    data: userPermissions.map(p => ({ role_id: userRole.id, permission_id: p.id })),
  });

  // Viewer role - read only
  const viewerRole = await prisma.roles.upsert({
    where: { tenant_id_name: { tenant_id: tenant.id, name: 'Viewer' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      name: 'Viewer',
      description: 'Read-only access',
      is_system: true,
    },
  });

  const viewerPermissions = allPermissions.filter(p => p.action === 'read');
  await prisma.role_permissions.deleteMany({ where: { role_id: viewerRole.id } });
  await prisma.role_permissions.createMany({
    data: viewerPermissions.map(p => ({ role_id: viewerRole.id, permission_id: p.id })),
  });

  // Create sample departments
  const hrDept = await prisma.departments.create({
    data: {
      tenant_id: tenant.id,
      name: 'Phòng Nhân sự',
      description: 'Quản lý nhân sự và tuyển dụng',
    },
  });

  const itDept = await prisma.departments.create({
    data: {
      tenant_id: tenant.id,
      name: 'Phòng IT',
      description: 'Công nghệ thông tin',
    },
  });

  const salesDept = await prisma.departments.create({
    data: {
      tenant_id: tenant.id,
      name: 'Phòng Kinh doanh',
      description: 'Bán hàng và chăm sóc khách hàng',
    },
  });

  // Assign admin role to existing admin user
  const adminUser = await prisma.users.findFirst({
    where: { email: 'admin@example.com' },
  });

  if (adminUser) {
    await prisma.user_roles.upsert({
      where: { user_id_role_id: { user_id: adminUser.id, role_id: adminRole.id } },
      update: {},
      create: { user_id: adminUser.id, role_id: adminRole.id },
    });
    
    await prisma.users.update({
      where: { id: adminUser.id },
      data: { 
        full_name: 'Admin User',
        department_id: itDept.id,
      },
    });
  }

  console.log('✅ RBAC system seeded successfully!');
  console.log(`   - ${allPermissions.length} permissions`);
  console.log(`   - 4 default roles (Admin, Manager, User, Viewer)`);
  console.log(`   - 3 sample departments`);
}

seedRBAC()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
