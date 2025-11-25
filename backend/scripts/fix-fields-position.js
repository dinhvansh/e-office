const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SIGN_REQUEST_ID = 50;

async function fixFields() {
  console.log('\n🔧 FIX FIELDS POSITION');
  console.log('='.repeat(60));
  
  try {
    // Delete old fields
    console.log('\n🗑️  Deleting old fields...');
    const deleted = await prisma.sign_request_fields.deleteMany({
      where: { sign_request_id: SIGN_REQUEST_ID }
    });
    console.log(`✅ Deleted ${deleted.count} old fields`);

    // Get signer info
    const signRequest = await prisma.sign_requests.findUnique({
      where: { id: SIGN_REQUEST_ID },
      include: { signers: true }
    });

    const signer = signRequest.signers[0];
    console.log(`\n👤 Signer: ${signer.email}`);

    // Create new fields with correct position
    console.log('\n📝 Creating new fields with correct position...');
    
    const signatureField = await prisma.sign_request_fields.create({
      data: {
        document_id: signRequest.document_id,
        sign_request_id: SIGN_REQUEST_ID,
        assigned_signer_id: signer.id,
        type: 'signature',
        page: 1,
        x: 10,      // 10% from left
        y: 50,      // 50% from top
        width: 80,  // Small width
        height: 30, // Small height
        required: true,
        label: 'Chữ ký'
      }
    });

    const dateField = await prisma.sign_request_fields.create({
      data: {
        document_id: signRequest.document_id,
        sign_request_id: SIGN_REQUEST_ID,
        assigned_signer_id: signer.id,
        type: 'date',
        page: 1,
        x: 10,      // 10% from left
        y: 58,      // 58% from top (below signature)
        width: 60,  // Small width
        height: 15, // Small height
        required: true,
        label: 'Ngày ký'
      }
    });

    console.log('✅ Created new fields:');
    console.log(`   - Signature: ${signatureField.id} (10%, 50%, 80x30)`);
    console.log(`   - Date: ${dateField.id} (10%, 58%, 60x15)`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ FIXED!');
    console.log('='.repeat(60));
    console.log('\n💡 Now test again:');
    console.log(`   URL: http://localhost:3000/sign/${signer.signing_token}`);
    console.log('   Fields should now be visible!');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixFields();
