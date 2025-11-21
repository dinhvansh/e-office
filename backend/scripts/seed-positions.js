/**
 * Seed Positions (Chức danh)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding positions...\n');

  const tenant = await prisma.tenants.findFirst();
  if (!tenant) {
    throw new Error('No tenant found');
  }

  const positions = [
    { code: 'CEO', name: 'Chief Executive Officer', description: 'Giám đốc điều hành', level: 1 },
    { code: 'CFO', name: 'Chief Financial Officer', description: 'Giám đốc tài chính', level: 2 },
    { code: 'CTO', name: 'Chief Technology Officer', description: 'Giám đốc công nghệ', level: 2 },
    { code: 'COO', name: 'Chief Operating Officer', description: 'Giám đốc vận hành', level: 2 },
    { code: 'DIRECTOR', name: 'Director', description: 'Giám đốc', level: 3 },
    { code: 'HOD', name: 'Head of Department', description: 'Trưởng phòng', level: 4 },
    { code: 'MANAGER', name: 'Manager', description: 'Quản lý', level: 5 },
    { code: 'SUPERVISOR', name: 'Supervisor', description: 'Giám sát viên', level: 6 },
    { code: 'TEAM_LEAD', name: 'Team Lead', description: 'Trưởng nhóm', level: 7 },
    { code: 'SENIOR', name: 'Senior Staff', description: 'Nhân viên cao cấp', level: 8 },
    { code: 'STAFF', name: 'Staff', description: 'Nhân viên', level: 9 },
    { code: 'INTERN', name: 'Intern', description: 'Thực tập sinh', level: 10 },
  ];

  for (const pos of positions) {
    const existing = await prisma.positions.findFirst({
      where: {
        tenant_id: tenant.id,
        code: pos.code,
      },
    });

    if (existing) {
      console.log(`✓ Position exists: ${pos.name}`);
    } else {
      await prisma.positions.create({
        data: {
          tenant_id: tenant.id,
          ...pos,
          is_active: true,
        },
      });
      console.log(`✅ Created: ${pos.name} (${pos.code})`);
    }
  }

  console.log('\n✅ Positions seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
