/**
 * Seed missing numbering rules for document types
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedMissingNumberingRules() {
  console.log('🔢 Seeding missing numbering rules...\n');

  try {
    const tenant = await prisma.tenants.findFirst();
    if (!tenant) {
      console.log('❌ No tenant found');
      return;
    }

    // Get all document types
    const docTypes = await prisma.document_types.findMany({
      where: { tenant_id: tenant.id },
      include: {
        numbering_rules: true
      }
    });

    console.log(`Found ${docTypes.length} document types\n`);

    // Numbering rules configuration
    const numberingRulesConfig = [
      {
        code: 'CV_DEN',
        pattern: '{AUTO}/{YEAR}',
        description: 'Công văn đến'
      },
      {
        code: 'CV_DI',
        pattern: '{AUTO}/{YEAR}',
        description: 'Công văn đi'
      },
      {
        code: 'HOP_DONG',
        pattern: '{AUTO}/{YEAR}',
        description: 'Hợp đồng'
      },
      {
        code: 'DE_XUAT',
        pattern: '{AUTO}/{YEAR}',
        description: 'Đề xuất'
      }
    ];

    console.log('Creating missing numbering rules:\n');

    for (const config of numberingRulesConfig) {
      const docType = docTypes.find(dt => dt.code === config.code);
      
      if (!docType) {
        console.log(`⚠️  Document type ${config.code} not found, skipping...`);
        continue;
      }

      if (docType.numbering_rules && docType.numbering_rules.length > 0) {
        console.log(`✅ ${config.description} (${config.code}) - Already has numbering rule`);
        continue;
      }

      // Create numbering rule
      const numberingRule = await prisma.numbering_rules.create({
        data: {
          tenant_id: tenant.id,
          document_type_id: docType.id,
          pattern: config.pattern,
          last_number: 0,
          reset_yearly: true,
          is_active: true
        }
      });

      console.log(`✅ Created: ${config.description} (${config.code})`);
      console.log(`   Pattern: ${config.pattern}`);
      console.log(`   Rule ID: ${numberingRule.id}`);
      console.log('');
    }

    console.log('\n🎉 Numbering rules seeded successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedMissingNumberingRules();
