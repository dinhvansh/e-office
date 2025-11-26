/**
 * Check all document types and their numbering rules
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllDocumentTypes() {
  console.log('🔍 Checking all document types...\n');

  try {
    const tenant = await prisma.tenants.findFirst();
    if (!tenant) {
      console.log('❌ No tenant found');
      return;
    }

    const docTypes = await prisma.document_types.findMany({
      where: { tenant_id: tenant.id },
      include: {
        numbering_rules: true
      },
      orderBy: { name: 'asc' }
    });

    console.log(`Found ${docTypes.length} document types:\n`);

    docTypes.forEach((dt, index) => {
      console.log(`${index + 1}. ${dt.name} (${dt.code})`);
      console.log(`   ID: ${dt.id}`);
      console.log(`   Require Digital Signing: ${dt.require_digital_signing ? 'Yes' : 'No'}`);
      
      const rule = dt.numbering_rules?.[0];
      if (rule) {
        console.log(`   ✅ Has numbering rule:`);
        console.log(`      Pattern: ${rule.pattern}`);
        console.log(`      Counter: ${rule.last_number}`);
        console.log(`      Active: ${rule.is_active ? 'Yes' : 'No'}`);
      } else {
        console.log(`   ❌ NO NUMBERING RULE - Will cause error!`);
      }
      console.log('');
    });

    const withoutRules = docTypes.filter(dt => !dt.numbering_rules || dt.numbering_rules.length === 0);
    if (withoutRules.length > 0) {
      console.log(`\n⚠️  ${withoutRules.length} document types WITHOUT numbering rules:`);
      withoutRules.forEach(dt => {
        console.log(`   - ${dt.name} (${dt.code})`);
      });
      console.log('\n💡 These will cause "Numbering rule not configured" error when uploading!');
    } else {
      console.log('✅ All document types have numbering rules!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllDocumentTypes();
