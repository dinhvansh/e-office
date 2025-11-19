const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding external organizations...");

  const tenant = await prisma.tenants.findFirst();
  if (!tenant) {
    console.error("❌ No tenant found. Run seed.js first.");
    return;
  }

  const orgs = [
    {
      tenant_id: tenant.id,
      name: "Bộ Tài chính",
      code: "BTC",
      category: "government",
      address: "28 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội",
      phone: "024-22200001",
      email: "contact@mof.gov.vn",
      contact_person: "Nguyễn Văn A",
    },
    {
      tenant_id: tenant.id,
      name: "Bộ Kế hoạch và Đầu tư",
      code: "BKHDT",
      category: "government",
      address: "6B Hoàng Diệu, Ba Đình, Hà Nội",
      phone: "024-38455298",
      email: "contact@mpi.gov.vn",
      contact_person: "Trần Thị B",
    },
    {
      tenant_id: tenant.id,
      name: "Công ty TNHH ABC",
      code: "ABC",
      category: "supplier",
      address: "123 Nguyễn Trãi, Thanh Xuân, Hà Nội",
      phone: "024-12345678",
      email: "info@abc.com.vn",
      contact_person: "Lê Văn C",
    },
    {
      tenant_id: tenant.id,
      name: "Công ty Cổ phần XYZ",
      code: "XYZ",
      category: "customer",
      address: "456 Láng Hạ, Đống Đa, Hà Nội",
      phone: "024-87654321",
      email: "contact@xyz.com.vn",
      contact_person: "Phạm Thị D",
    },
    {
      tenant_id: tenant.id,
      name: "Ngân hàng TMCP Vietcombank",
      code: "VCB",
      category: "partner",
      address: "198 Trần Quang Khải, Hoàn Kiếm, Hà Nội",
      phone: "1900545413",
      email: "contact@vietcombank.com.vn",
      contact_person: "Hoàng Văn E",
    },
  ];

  for (const org of orgs) {
    await prisma.external_organizations.upsert({
      where: {
        tenant_id_code: {
          tenant_id: org.tenant_id,
          code: org.code,
        },
      },
      update: org,
      create: org,
    });
    console.log(`✅ Created/Updated: ${org.name} (${org.code})`);
  }

  console.log("\n✅ External organizations seeded successfully!");
  console.log(`Total: ${orgs.length} organizations`);
}

main()
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
