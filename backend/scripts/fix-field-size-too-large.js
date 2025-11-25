const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixFieldSizeTooLarge() {
  console.log('🔧 Fixing field sizes that are too large...\n');

  try {
    // Get all fields
    const fields = await prisma.sign_request_fields.findMany({
      orderBy: { id: 'asc' }
    });

    console.log(`📊 Found ${fields.length} fields\n`);

    let fixedCount = 0;

    for (const field of fields) {
      let needsUpdate = false;
      let newWidth = field.width;
      let newHeight = field.height;

      // Check if width is too large (> 30% of page)
      if (field.width > 30) {
        needsUpdate = true;
        // Scale down proportionally
        const scaleFactor = 20 / field.width; // Target 20% width
        newWidth = 20;
        newHeight = field.height * scaleFactor;
        console.log(`📏 Field ${field.id} (${field.type}): Width too large`);
        console.log(`   Before: ${field.width.toFixed(2)}% x ${field.height.toFixed(2)}%`);
        console.log(`   After:  ${newWidth.toFixed(2)}% x ${newHeight.toFixed(2)}%`);
      }

      // Check if height is too large (> 15% of page)
      if (field.height > 15) {
        needsUpdate = true;
        // Scale down proportionally
        const scaleFactor = 8 / field.height; // Target 8% height
        newHeight = 8;
        newWidth = field.width * scaleFactor;
        console.log(`📏 Field ${field.id} (${field.type}): Height too large`);
        console.log(`   Before: ${field.width.toFixed(2)}% x ${field.height.toFixed(2)}%`);
        console.log(`   After:  ${newWidth.toFixed(2)}% x ${newHeight.toFixed(2)}%`);
      }

      if (needsUpdate) {
        await prisma.sign_request_fields.update({
          where: { id: field.id },
          data: {
            width: newWidth,
            height: newHeight
          }
        });
        fixedCount++;
        console.log(`   ✅ Updated\n`);
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} fields`);
    console.log(`✅ ${fields.length - fixedCount} fields were already OK`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixFieldSizeTooLarge();
