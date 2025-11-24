/**
 * Check which document types require digital signing
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('📋 Checking Document Types - Digital Signing Status\n');

  try {
    const docTypes = await prisma.document_types.findMany({
      where: { tenant_id: 1 },
      orderBy: { id: 'asc' },
    });

    console.log(`Found ${docTypes.length} document types:\n`);

    docTypes.forEach((dt) => {
      const hasSigningField = dt.require_digital_signing !== undefined;
      const requiresSigning = dt.require_digital_signing === true;
      
      console.log(`${dt.id}. ${dt.name} (${dt.code})`);
      console.log(`   Has field: ${hasSigningField ? '✅' : '❌'}`);
      console.log(`   Requires signing: ${requiresSigning ? '✅ YES' : '❌ NO'}`);
      console.log('');
    });

    // Check if field exists in schema
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'document_types' 
      AND column_name = 'require_digital_signing'
    `;

    console.log('\n📊 Schema Check:');
    if (tableInfo && tableInfo.length > 0) {
      console.log('✅ Field "require_digital_signing" EXISTS in database');
      console.log(`   Type: ${tableInfo[0].data_type}`);
    } else {
      console.log('❌ Field "require_digital_signing" DOES NOT EXIST in database');
      console.log('   Need to add migration!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
