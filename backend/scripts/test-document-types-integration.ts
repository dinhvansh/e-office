/**
 * Test script for document types + numbering integration
 * Run: npx ts-node backend/scripts/test-document-types-integration.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing Document Types + Numbering Integration\n');

  // Get first tenant
  const tenant = await prisma.tenants.findFirst();
  if (!tenant) {
    console.error('❌ No tenant found. Run seed script first.');
    return;
  }
  console.log(`✅ Using tenant: ${tenant.name} (ID: ${tenant.id})`);

  // Get document types
  const documentTypes = await prisma.document_types.findMany({
    where: { tenant_id: tenant.id },
    include: { numbering_rules: true },
  });

  console.log(`\n📋 Found ${documentTypes.length} document types:`);
  documentTypes.forEach((type) => {
    console.log(`  - ${type.name} (${type.code})`);
    console.log(`    Require numbering: ${type.require_numbering}`);
    if (type.numbering_rules.length > 0) {
      console.log(`    Rule: ${type.numbering_rules[0].pattern} (last: ${type.numbering_rules[0].last_number})`);
    }
  });

  // Test Case 1: Document type without numbering
  const typeWithoutNumbering = documentTypes.find((t) => !t.require_numbering);
  if (typeWithoutNumbering) {
    console.log(`\n✅ Test 1: Type without numbering - ${typeWithoutNumbering.name}`);
    console.log(`   Expected: document_type_id set, document_number NULL`);
  }

  // Test Case 2: Document type with numbering and rule
  const typeWithNumbering = documentTypes.find(
    (t) => t.require_numbering && t.numbering_rules.length > 0
  );
  if (typeWithNumbering) {
    console.log(`\n✅ Test 2: Type with numbering - ${typeWithNumbering.name}`);
    console.log(`   Expected: document_type_id set, document_number generated`);
    console.log(`   Pattern: ${typeWithNumbering.numbering_rules[0].pattern}`);
  }

  // Test Case 3: Document type with numbering but no rule
  const typeWithoutRule = documentTypes.find(
    (t) => t.require_numbering && t.numbering_rules.length === 0
  );
  if (typeWithoutRule) {
    console.log(`\n⚠️  Test 3: Type with numbering but no rule - ${typeWithoutRule.name}`);
    console.log(`   Expected: API should return 400 error`);
  }

  console.log('\n📝 Manual Testing Instructions:');
  console.log('1. Start backend: cd backend && npm run dev');
  console.log('2. Start frontend: cd frontend && npm run dev');
  console.log('3. Login to the app');
  console.log('4. Go to /documents page');
  console.log('5. Try uploading with different document types');
  console.log('6. Check "Số văn bản" column in the table');
  console.log('\n✅ Integration test preparation complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
