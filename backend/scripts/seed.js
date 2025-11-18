const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
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

  const hash = bcrypt.hashSync("secret123", 10);

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

  console.log("Seed complete");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
