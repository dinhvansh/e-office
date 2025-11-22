const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSequences() {
  console.log('🔧 Fixing database sequences...\n');

  const tables = [
    'tenants',
    'departments',
    'positions',
    'users',
    'permissions',
    'roles',
    'role_permissions',
    'user_roles',
    'external_organizations',
    'workflows',
    'workflow_steps',
    'document_types',
    'numbering_rules',
    'documents',
    'workflow_instances',
    'document_approvals',
    'sign_requests',
    'signers',
    'sign_request_fields',
    'sign_request_field_values',
  ];

  for (const table of tables) {
    try {
      // Get max ID
      const result = await prisma.$queryRawUnsafe(
        `SELECT MAX(id) as max_id FROM ${table}`
      );
      
      const maxId = result[0]?.max_id || 0;
      
      if (maxId > 0) {
        // Reset sequence to max_id + 1
        await prisma.$executeRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('${table}', 'id'), ${maxId}, true)`
        );
        console.log(`✅ ${table.padEnd(30)} → sequence set to ${maxId + 1}`);
      } else {
        console.log(`⏭️  ${table.padEnd(30)} → empty table, skipped`);
      }
    } catch (err) {
      console.log(`⚠️  ${table.padEnd(30)} → ${err.message}`);
    }
  }

  console.log('\n🎉 Sequences fixed!');
  await prisma.$disconnect();
}

fixSequences().catch(console.error);
