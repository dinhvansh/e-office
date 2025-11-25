/**
 * Convert existing fields from pixel to percentage format
 * 
 * This script fixes old fields that were saved with pixel dimensions
 * by converting them to percentage based on standard PDF size (A4: 595x842pt)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Standard A4 PDF size in points (at 72 DPI)
const PDF_WIDTH = 595;
const PDF_HEIGHT = 842;

async function convertFieldsToPercentage() {
  console.log('🔧 Converting fields from pixel to percentage format\n');

  try {
    // Find all fields with pixel dimensions (width > 100 or height > 100)
    const fieldsToFix = await prisma.sign_request_fields.findMany({
      where: {
        OR: [
          { width: { gt: 100 } },
          { height: { gt: 100 } }
        ]
      },
      include: {
        sign_request: {
          include: {
            document: true
          }
        }
      }
    });

    console.log(`Found ${fieldsToFix.length} fields with pixel dimensions\n`);

    if (fieldsToFix.length === 0) {
      console.log('✅ No fields need conversion. All fields already use percentage format.\n');
      return;
    }

    // Convert each field
    let converted = 0;
    for (const field of fieldsToFix) {
      console.log(`Field ${field.id} (${field.type}):`);
      console.log(`  Before: width=${field.width}, height=${field.height}`);

      // Convert width/height from pixel to percentage
      // Assuming fields were created on a canvas that scales PDF to fit
      // We'll use standard A4 size as reference
      const widthPercent = (field.width / PDF_WIDTH) * 100;
      const heightPercent = (field.height / PDF_HEIGHT) * 100;

      console.log(`  After:  width=${widthPercent.toFixed(2)}%, height=${heightPercent.toFixed(2)}%`);

      // Update field
      await prisma.sign_request_fields.update({
        where: { id: field.id },
        data: {
          width: parseFloat(widthPercent.toFixed(2)),
          height: parseFloat(heightPercent.toFixed(2))
        }
      });

      converted++;
      console.log(`  ✅ Converted\n`);
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total fields converted: ${converted}`);
    console.log(`   ✅ All fields now use percentage format\n`);

    console.log('🎉 Conversion complete!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Test signing page to verify fields display correctly');
    console.log('   2. Fields should now have appropriate size');
    console.log('   3. No more overlapping or oversized fields');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

convertFieldsToPercentage();
