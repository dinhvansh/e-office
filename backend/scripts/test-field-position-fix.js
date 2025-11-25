/**
 * Test script: Verify field position fix (percentage-based)
 * 
 * Root Cause Fixed:
 * - Editor was saving pixel positions (500-1000px)
 * - Should save percentage positions (0-100%)
 * 
 * Fix Applied:
 * - PDFCanvasViewer: Convert click pixel → percentage before save
 * - PDFCanvasViewer: Convert percentage → pixel when rendering
 * - PDFSigningViewer: Already correct (converts % → px)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFieldPositionFix() {
  console.log('🧪 Testing Field Position Fix\n');

  try {
    // Step 1: Find latest document with fields
    console.log('📋 Step 1: Find latest document with fields...');
    const latestDoc = await prisma.documents.findFirst({
      where: {
        sign_request_id: { not: null }
      },
      include: {
        sign_request: {
          include: {
            fields: true,
            signers: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    if (!latestDoc || !latestDoc.sign_request) {
      console.log('❌ No document with sign request found');
      return;
    }

    console.log(`✅ Found document: ${latestDoc.title || latestDoc.original_file_name}`);
    console.log(`   Sign Request ID: ${latestDoc.sign_request.id}`);
    console.log(`   Fields: ${latestDoc.sign_request.fields.length}`);
    console.log(`   Signers: ${latestDoc.sign_request.signers.length}\n`);

    // Step 2: Check field positions
    console.log('📍 Step 2: Check field positions...');
    const fields = latestDoc.sign_request.fields;

    if (fields.length === 0) {
      console.log('⚠️  No fields found. Please add fields in editor first.\n');
      console.log('💡 To test:');
      console.log('   1. Go to http://localhost:3000/documents');
      console.log('   2. Upload document with digital signing');
      console.log('   3. Click "Fields" button');
      console.log('   4. Click on PDF to add signature field');
      console.log('   5. Check console for position logs');
      console.log('   6. Run this script again\n');
      return;
    }

    console.log('Field Positions:\n');
    let hasInvalidPositions = false;

    fields.forEach((field, index) => {
      const isPercentage = field.x <= 100 && field.y <= 100;
      const isPixel = field.x > 100 || field.y > 100;

      console.log(`Field ${index + 1} (${field.type}):`);
      console.log(`  Position: (${field.x}, ${field.y})`);
      console.log(`  Size: ${field.width} x ${field.height}`);
      console.log(`  Page: ${field.page}`);
      console.log(`  Format: ${isPercentage ? '✅ Percentage (0-100%)' : '❌ Pixel (>100)'}`);
      
      if (isPixel) {
        hasInvalidPositions = true;
        console.log(`  ⚠️  WARNING: Position looks like pixel, should be percentage!`);
      }
      console.log('');

      if (isPixel) hasInvalidPositions = true;
    });

    // Step 3: Summary
    console.log('📊 Summary:\n');
    if (hasInvalidPositions) {
      console.log('❌ FOUND INVALID POSITIONS (pixel format)');
      console.log('');
      console.log('🔧 To fix:');
      console.log('   1. Frontend fix already applied in PDFCanvasViewer.tsx');
      console.log('   2. Delete old fields and re-add them');
      console.log('   3. New fields will use percentage format');
      console.log('');
      console.log('💡 Or run fix script:');
      console.log('   node scripts/fix-fields-position.js');
    } else {
      console.log('✅ ALL POSITIONS VALID (percentage format)');
      console.log('');
      console.log('🎉 Fields will display correctly on signing page!');
      console.log('');
      console.log('📝 Next steps:');
      console.log('   1. Send sign request');
      console.log('   2. Open signing URL');
      console.log('   3. Verify fields appear at correct positions');
    }

    // Step 4: Show signing URL if available
    const signer = latestDoc.sign_request.signers[0];
    if (signer && signer.signing_token) {
      console.log('');
      console.log('🔗 Test Signing URL:');
      console.log(`   http://localhost:3000/sign/${signer.signing_token}`);
      console.log('');
      console.log('📧 Signer: ' + signer.email);
      if (signer.otp) {
        console.log('🔑 OTP: ' + signer.otp);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testFieldPositionFix();
