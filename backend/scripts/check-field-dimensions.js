/**
 * Check field dimensions (width/height) to verify if they're pixel or percentage
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFieldDimensions() {
  const signRequestId = 50; // Latest sign request from test

  console.log(`🔍 Checking field dimensions for sign request ${signRequestId}\n`);

  const fields = await prisma.sign_request_fields.findMany({
    where: { sign_request_id: signRequestId },
    orderBy: { id: 'asc' }
  });

  console.log(`Found ${fields.length} fields:\n`);

  fields.forEach((field, index) => {
    console.log(`Field ${index + 1} (${field.type}):`);
    console.log(`  Position: (${field.x}, ${field.y})`);
    console.log(`  Size: ${field.width} x ${field.height}`);
    console.log(`  Page: ${field.page}`);
    
    // Check if dimensions are pixel or percentage
    const isPosPercent = field.x <= 100 && field.y <= 100;
    const isSizePixel = field.width > 100 || field.height > 100;
    
    console.log(`  Position format: ${isPosPercent ? '✅ Percentage' : '❌ Pixel'}`);
    console.log(`  Size format: ${isSizePixel ? '❌ PIXEL (PROBLEM!)' : '✅ Percentage'}`);
    
    if (isSizePixel) {
      console.log(`  ⚠️  WIDTH/HEIGHT SHOULD BE PERCENTAGE!`);
      console.log(`     Current: ${field.width}px x ${field.height}px`);
      console.log(`     Should be: ~10% x ~5% (relative to PDF size)`);
    }
    console.log('');
  });

  await prisma.$disconnect();
}

checkFieldDimensions();
