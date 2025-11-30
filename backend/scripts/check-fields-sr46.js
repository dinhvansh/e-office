const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Checking all fields for Sign Request #46...\n');

    // Get ALL fields including deleted ones
    const allFields = await prisma.sign_request_fields.findMany({
      where: {
        sign_request_id: 46
      },
      orderBy: {
        id: 'asc'
      }
    });

    console.log(`Total fields in database: ${allFields.length}\n`);

    allFields.forEach((field, idx) => {
      console.log(`${idx + 1}. Field ID ${field.id}:`);
      console.log(`   Type: ${field.type}`);
      console.log(`   Page: ${field.page}`);
      console.log(`   Position: (${field.x}, ${field.y})`);
      console.log(`   Size: ${field.width} x ${field.height}`);
      console.log(`   Signer ID: ${field.assigned_signer_id}`);
      console.log(`   Created: ${field.created_at}`);
      console.log('');
    });

    // Group by type
    const byType = {};
    allFields.forEach(f => {
      byType[f.type] = (byType[f.type] || 0) + 1;
    });

    console.log('Fields by type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
