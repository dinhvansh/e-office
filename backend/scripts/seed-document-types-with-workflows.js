/**
 * Seed document types with workflows
 * This script creates/updates document types with proper workflow configuration
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedDocumentTypesWithWorkflows() {
  console.log('🌱 Seeding document types with workflows...\n');

  try {
    // Get tenant
    const tenant = await prisma.tenants.findFirst();
    if (!tenant) {
      console.log('❌ No tenant found');
      return;
    }

    // Get workflows
    const workflows = await prisma.workflows.findMany({
      where: { tenant_id: tenant.id }
    });

    console.log(`Found ${workflows.length} workflows\n`);

    // Document types configuration
    const docTypesConfig = [
      {
        code: 'CV_DEN',
        name: 'Công văn đến',
        require_digital_signing: false,
        require_approval: false,
        allow_workflow_override: false,
        default_workflow_id: null
      },
      {
        code: 'CV_DI',
        name: 'Công văn đi',
        require_digital_signing: true,
        require_approval: true,
        allow_workflow_override: true,
        default_workflow_id: workflows.find(w => w.name.includes('2 cấp'))?.id || null
      },
      {
        code: 'HOP_DONG',
        name: 'Hợp đồng',
        require_digital_signing: true,
        require_approval: true,
        allow_workflow_override: false, // Strict mode
        default_workflow_id: workflows.find(w => w.name.includes('2 cấp'))?.id || null
      },
      {
        code: 'QUYET_DINH',
        name: 'Quyết định',
        require_digital_signing: true,
        require_approval: false,
        allow_workflow_override: false,
        default_workflow_id: null
      },
      {
        code: 'THONG_BAO',
        name: 'Thông báo',
        require_digital_signing: false,
        require_approval: false,
        allow_workflow_override: false,
        default_workflow_id: null
      },
      {
        code: 'BIEN_BAN',
        name: 'Biên bản',
        require_digital_signing: false,
        require_approval: false,
        allow_workflow_override: false,
        default_workflow_id: null
      },
      {
        code: 'DE_XUAT',
        name: 'Đề xuất',
        require_digital_signing: false,
        require_approval: true,
        allow_workflow_override: true,
        default_workflow_id: workflows.find(w => w.name.includes('2 cấp'))?.id || null
      },
      {
        code: 'BAO_CAO',
        name: 'Báo cáo',
        require_digital_signing: false,
        require_approval: false,
        allow_workflow_override: false,
        default_workflow_id: null
      }
    ];

    console.log('Creating/updating document types:\n');

    for (const config of docTypesConfig) {
      const existing = await prisma.document_types.findFirst({
        where: {
          tenant_id: tenant.id,
          code: config.code
        }
      });

      if (existing) {
        // Update existing
        await prisma.document_types.update({
          where: { id: existing.id },
          data: {
            name: config.name,
            require_digital_signing: config.require_digital_signing,
            require_approval: config.require_approval,
            allow_workflow_override: config.allow_workflow_override,
            default_workflow_id: config.default_workflow_id,
            is_active: true
          }
        });
        console.log(`✅ Updated: ${config.name} (${config.code})`);
      } else {
        // Create new
        await prisma.document_types.create({
          data: {
            tenant_id: tenant.id,
            code: config.code,
            name: config.name,
            require_digital_signing: config.require_digital_signing,
            require_approval: config.require_approval,
            allow_workflow_override: config.allow_workflow_override,
            default_workflow_id: config.default_workflow_id,
            is_active: true
          }
        });
        console.log(`✅ Created: ${config.name} (${config.code})`);
      }

      // Show workflow mode
      let mode = 'No Approval';
      if (config.require_approval) {
        if (!config.default_workflow_id) {
          mode = 'Ad-hoc';
        } else if (!config.allow_workflow_override) {
          mode = 'Strict';
        } else {
          mode = 'Flexible';
        }
      }
      console.log(`   Mode: ${mode}`);
      console.log(`   Digital Signing: ${config.require_digital_signing ? 'YES' : 'NO'}`);
      console.log('');
    }

    console.log('\n🎉 Document types seeded successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedDocumentTypesWithWorkflows();
