const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const demoAdminPassword = process.env.DEMO_ADMIN_PASSWORD;
  if (!demoAdminPassword || demoAdminPassword.length < 16 || ["secret123", "password123"].includes(demoAdminPassword.toLowerCase())) {
    throw new Error("DEMO_ADMIN_PASSWORD must be set to a unique value of at least 16 characters before running the demo seed");
  }

  const tenant = await prisma.tenants.upsert({
    where: { id: 1 },
    update: {
      name: "Acme Corp",
      domain: "acme.local",
      plan: "on-prem-enterprise",
      status: "active",
    },
    create: {
      name: "Acme Corp",
      domain: "acme.local",
      plan: "on-prem-enterprise",
      status: "active",
    },
  });

  const hash = bcrypt.hashSync(demoAdminPassword, 10);

  await prisma.users.upsert({
    where: { email: "admin@acme.local" },
    update: {
      tenant_id: tenant.id,
      password_hash: hash,
      role: "admin",
      status: "active",
    },
    create: {
      tenant_id: tenant.id,
      email: "admin@acme.local",
      password_hash: hash,
      role: "admin",
      status: "active",
    },
  });

  await prisma.license.upsert({
    where: { id: 1 },
    update: {
      tenant: "Acme Corp",
      license_key: "WP-SIGN-ENTERPRISE-001",
      expire_date: new Date("2026-12-31"),
      limit_user: 100,
      limit_docs: 10000,
      signature: "demo",
    },
    create: {
      tenant: "Acme Corp",
      license_key: "WP-SIGN-ENTERPRISE-001",
      expire_date: new Date("2026-12-31"),
      limit_user: 100,
      limit_docs: 10000,
      signature: "demo",
    },
  });

  // Seed departments with code field
  const departments = [
    { code: "IT", name: "Phòng Công nghệ thông tin", description: "Quản lý hệ thống và phát triển phần mềm" },
    { code: "HR", name: "Phòng Nhân sự", description: "Quản lý nhân sự và tuyển dụng" },
    { code: "FIN", name: "Phòng Tài chính", description: "Quản lý tài chính và kế toán" },
    { code: "MKT", name: "Phòng Marketing", description: "Marketing và truyền thông" },
    { code: "SALE", name: "Phòng Kinh doanh", description: "Bán hàng và chăm sóc khách hàng" },
  ];

  for (const dept of departments) {
    // Check if department exists
    const existing = await prisma.departments.findFirst({
      where: {
        tenant_id: tenant.id,
        code: dept.code,
      },
    });

    if (existing) {
      // Update existing
      await prisma.departments.update({
        where: { id: existing.id },
        data: {
          name: dept.name,
          description: dept.description,
        },
      });
    } else {
      // Create new
      await prisma.departments.create({
        data: {
          tenant_id: tenant.id,
          code: dept.code,
          name: dept.name,
          description: dept.description,
        },
      });
    }
  }

  console.log("Seed complete: tenant, admin user, license, and 5 departments");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
