const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNumberingRules() {
  try {
    console.log('🔍 Checking Numbering Rules...\n');

    // Get all numbering rules
    const rules = await prisma.numbering_rules.findMany({
      include: {
        document_type: true,
      },
    });

    if (rules.length === 0) {
      console.log('❌ No numbering rules found!');
      return;
    }

    console.log(`✅ Found ${rules.length} numbering rules:\n`);

    rules.forEach((rule, index) => {
      console.log(`${index + 1}. Document Type: ${rule.document_type.name} (${rule.document_type.code})`);
      console.log(`   Pattern: ${rule.pattern}`);
      console.log(`   Last Number: ${rule.last_number}`);
      console.log(`   Reset Yearly: ${rule.reset_yearly}`);
      console.log(`   Active: ${rule.is_active}`);
      console.log('');
    });

    // Get documents with numbers
    console.log('📄 Checking documents with auto-generated numbers...\n');
    
    const docs = await prisma.documents.findMany({
      where: {
        document_number: {
          not: null,
        },
      },
      include: {
        document_type: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 10,
    });

    if (docs.length === 0) {
      console.log('❌ No documents with auto-generated numbers found!');
    } else {
      console.log(`✅ Found ${docs.length} documents with numbers:\n`);
      docs.forEach((doc, index) => {
        console.log(`${index + 1}. Number: ${doc.document_number}`);
        console.log(`   Type: ${doc.document_type?.name || 'N/A'}`);
        console.log(`   File: ${doc.file_path.split('/').pop()}`);
        console.log(`   Created: ${doc.created_at.toISOString()}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkNumberingRules();
