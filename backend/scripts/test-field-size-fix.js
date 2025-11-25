/**
 * Test script: Verify field size fix (width/height as percentage)
 * 
 * Issue: Fields appear too large and overlapping on signing page
 * Root Cause: width/height saved as pixel (200px, 80px) instead of percentage
 * 
 * Fix Applied:
 * - PDFCanvasViewer: Convert size pixel → percentage before save
 * - PDFCanvasViewer: Convert size percentage → pixel when rendering
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFieldSizeFix() {
  console.log('🧪 Testing Field Size Fix\n');

  try {
    // Find latest sign request
    const latestSignRequest = await prisma.sign_requests.findFirst({
      where: {
        fields: { some: {} }
      },
      include: {
        fields: true,
        signers: true,
        document: true
      },
      orderBy: { created_at: 'desc' }
    });

    if (!latestSignRequest) {
      console.log('❌ No sign request with fields found\n');
      console.log('💡 To test:');
      console.log('   1. Go to http://localhost:3000/documents');
      console.log('   2. Upload document with digital signing');
      console.log('   3. Click "Fields" button');
      console.log('   4. Add signature and date fields');
      console.log('   5. Check console logs for size conversion');
      console.log('   6. Run this script again\n');
      return;
    }

    console.log(`✅ Found sign request: ${latestSignRequest.id}`);
    console.log(`   Document: ${latestSignRequest.document?.title || latestSignRequest.document?.original_file_name}`);
    console.log(`   Fields: ${latestSignRequest.fields.length}\n`);

    // Check field sizes
    console.log('📏 Field Sizes:\n');
    let hasInvalidSizes = false;

    latestSignRequest.fields.forEach((field, index) => {
      const isPosPercent = field.x <= 100 && field.y <= 100;
      const isSizePercent = field.width <= 100 && field.height <= 100;
      const isSizePixel = field.width > 100 || field.height > 100;

      console.log(`Field ${index + 1} (${field.type}):`);
      console.log(`  Position: (${field.x.toFixed(2)}%, ${field.y.toFixed(2)}%)`);
      console.log(`  Size: ${field.width} x ${field.height}`);
      console.log(`  Position format: ${isPosPercent ? '✅ Percentage' : '❌ Pixel'}`);
      console.log(`  Size format: ${isSizePercent ? '✅ Percentage' : '❌ PIXEL (PROBLEM!)'}`);

      if (isSizePixel) {
        hasInvalidSizes = true;
        console.log(`  ⚠️  WARNING: Size is in pixels, should be percentage!`);
        console.log(`     Current: ${field.width}px x ${field.height}px`);
        console.log(`     Expected: ~15-25% x ~5-10% (relative to PDF)`);
      }
      console.log('');
    });

    // Summary
    console.log('📊 Summary:\n');
    if (hasInvalidSizes) {
      console.log('❌ FOUND INVALID SIZES (pixel format)');
      console.log('');
      console.log('🔧 Fix applied in PDFCanvasViewer.tsx:');
      console.log('   - Convert size pixel → percentage when saving');
      console.log('   - Convert size percentage → pixel when rendering');
      console.log('');
      console.log('💡 To apply fix:');
      console.log('   1. Delete old fields in editor');
      console.log('   2. Add new fields (will use percentage)');
      console.log('   3. Or run: node scripts/fix-fields-position.js');
    } else {
      console.log('✅ ALL SIZES VALID (percentage format)');
      console.log('');
      console.log('🎉 Fields will display correctly with proper size!');
      console.log('');
      console.log('📝 Expected behavior:');
      console.log('   - Signature: ~20% x ~8% (relative to PDF)');
      console.log('   - Date: ~15% x ~5%');
      console.log('   - Text: ~18% x ~5%');
      console.log('   - Checkbox: ~3% x ~3%');
    }

    // Show test URL
    const signer = latestSignRequest.signers[0];
    if (signer && signer.signing_token) {
      console.log('');
      console.log('🔗 Test Signing URL:');
      console.log(`   http://localhost:3000/sign/${signer.signing_token}`);
      console.log('');
      console.log('📧 Signer: ' + signer.email);
      if (signer.otp) {
        console.log('🔑 OTP: ' + signer.otp);
      }
      console.log('');
      console.log('✅ Open URL and verify:');
      console.log('   - Fields appear at correct positions');
      console.log('   - Fields have appropriate size (not too big)');
      console.log('   - Fields don\'t overlap');
      console.log('   - Fields stay within PDF boundaries');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testFieldSizeFix();
