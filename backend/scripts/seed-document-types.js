const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedDocumentTypes() {
  console.log('🌱 Seeding Document Types...');

  // Get first tenant
  const tenant = await prisma.tenants.findFirst();
  if (!tenant) {
    console.log('❌ No tenant found. Run seed.js first.');
    return;
  }

  // Document types for E-Office
  const documentTypes = [
    {
      code: 'CV_DEN',
      name: 'Công văn đến',
      description: 'Văn bản đến từ bên ngoài',
      category: 'incoming',
      require_numbering: true,
      require_digital_signing: false,
    },
    {
      code: 'CV_DI',
      name: 'Công văn đi',
      description: 'Văn bản gửi đi bên ngoài',
      category: 'outgoing',
      require_numbering: true,
      require_digital_signing: true,
    },
    {
      code: 'HOP_DONG',
      name: 'Hợp đồng',
      description: 'Hợp đồng với đối tác',
      category: 'contract',
      require_numbering: true,
      require_digital_signing: true,
    },
    {
      code: 'QUYET_DINH',
      name: 'Quyết định',
      description: 'Quyết định nội bộ',
      category: 'internal',
      require_numbering: true,
      require_digital_signing: true,
    },
    {
      code: 'THONG_BAO',
      name: 'Thông báo',
      description: 'Thông báo nội bộ',
      category: 'internal',
      require_numbering: true,
      require_digital_signing: false,
    },
    {
      code: 'BIEN_BAN',
      name: 'Biên bản',
      description: 'Biên bản họp, làm việc',
      category: 'internal',
      require_numbering: true,
      require_digital_signing: false,
    },
    {
      code: 'DE_XUAT',
      name: 'Đề xuất',
      description: 'Đề xuất, kiến nghị',
      category: 'internal',
      require_numbering: true,
      require_digital_signing: false,
    },
    {
      code: 'BAO_CAO',
      name: 'Báo cáo',
      description: 'Báo cáo công việc',
      category: 'internal',
      require_numbering: true,
      require_digital_signing: false,
    },
  ];

  console.log('Creating document types...');
  for (const docType of documentTypes) {
    const existing = await prisma.document_types.findUnique({
      where: {
        tenant_id_code: {
          tenant_id: tenant.id,
          code: docType.code,
        },
      },
    });

    if (existing) {
      console.log(`  ⏭️  ${docType.name} already exists`);
      continue;
    }

    const created = await prisma.document_types.create({
      data: {
        ...docType,
        tenant_id: tenant.id,
      },
    });

    console.log(`  ✅ Created: ${created.name} (${created.code})`);

    // Create default numbering rule
    const numberingRule = await prisma.numbering_rules.create({
      data: {
        tenant_id: tenant.id,
        document_type_id: created.id,
        pattern: '{AUTO}/{YEAR}',
        reset_yearly: true,
        last_number: 0,
      },
    });

    console.log(`     📋 Numbering rule: ${numberingRule.pattern}`);
  }

  // Create sample external organizations
  console.log('\nCreating external organizations...');
  const externalOrgs = [
    {
      code: 'UBND_TP',
      name: 'UBND Thành phố',
      category: 'government',
      address: '123 Đường ABC, TP.HCM',
      phone: '028-1234567',
    },
    {
      code: 'CONG_TY_A',
      name: 'Công ty TNHH ABC',
      category: 'partner',
      address: '456 Đường XYZ, TP.HCM',
      phone: '028-7654321',
      email: 'contact@abc.com',
    },
    {
      code: 'KHACH_HANG_B',
      name: 'Khách hàng B',
      category: 'customer',
      phone: '0901234567',
      email: 'customer@example.com',
    },
  ];

  for (const org of externalOrgs) {
    const existing = await prisma.external_organizations.findUnique({
      where: {
        tenant_id_code: {
          tenant_id: tenant.id,
          code: org.code,
        },
      },
    });

    if (existing) {
      console.log(`  ⏭️  ${org.name} already exists`);
      continue;
    }

    await prisma.external_organizations.create({
      data: {
        ...org,
        tenant_id: tenant.id,
      },
    });

    console.log(`  ✅ Created: ${org.name}`);
  }

  console.log('\n✅ Document types seeded successfully!');
  console.log(`   - ${documentTypes.length} document types`);
  console.log(`   - ${externalOrgs.length} external organizations`);
}

seedDocumentTypes()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
