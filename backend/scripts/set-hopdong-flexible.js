const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setFlexibleMode() {
  console.log('🔧 Setting Hợp đồng to FLEXIBLE mode...\n');

  try {
    // Find first
    const docType = await prisma.document_types.findFirst({
      where: { code: 'HOP_DONG' },
    });

    if (!docType) {
      console.log('❌ Document type HOP_DONG not found');
      return;
    }

    const updated = await prisma.document_types.update({
      where: { id: docType.id },
      data: { allow_workflow_override: true },
    });

    console.log('✅ Updated successfully!');
    console.log(`   - Name: ${updated.name}`);
    console.log(`   - allow_workflow_override: ${updated.allow_workflow_override}`);
    console.log(`   - Mode: FLEXIBLE ✅`);
    console.log('\n🎯 Now you can test flexible mode in UI!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setFlexibleMode();
