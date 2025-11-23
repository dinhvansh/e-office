/**
 * Add sample signature fields to a sign request
 * Usage: node scripts/add-signature-fields.js [sign_request_id]
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addSignatureFields(signRequestId) {
  try {
    // Get sign request with signers
    const signRequest = await prisma.sign_requests.findUnique({
      where: { id: signRequestId },
      include: {
        signers: true,
        document: true,
      },
    });

    if (!signRequest) {
      console.log('❌ Sign request not found');
      return;
    }

    console.log('\n📋 Sign Request Information:');
    console.log('═'.repeat(60));
    console.log(`ID: ${signRequest.id}`);
    console.log(`Document: ${signRequest.document.title || signRequest.document.original_file_name}`);
    console.log(`Signers: ${signRequest.signers.length}`);
    console.log('═'.repeat(60));

    // Delete existing fields
    await prisma.sign_request_fields.deleteMany({
      where: { sign_request_id: signRequestId },
    });

    // Create sample fields for each signer
    const fields = [];
    signRequest.signers.forEach((signer, index) => {
      // Signature field
      fields.push({
        sign_request_id: signRequestId,
        document_id: signRequest.document_id,
        assigned_signer_id: signer.id,
        type: 'signature',
        page: 1,
        x: 10 + (index * 30), // Spread horizontally
        y: 70, // Near bottom
        width: 25,
        height: 10,
        required: true,
        label: `Chữ ký - ${signer.name}`,
      });

      // Date field
      fields.push({
        sign_request_id: signRequestId,
        document_id: signRequest.document_id,
        assigned_signer_id: signer.id,
        type: 'date',
        page: 1,
        x: 10 + (index * 30),
        y: 82,
        width: 25,
        height: 5,
        required: true,
        label: `Ngày ký - ${signer.name}`,
      });
    });

    // Insert fields
    await prisma.sign_request_fields.createMany({
      data: fields,
    });

    console.log('\n✅ Created signature fields:');
    console.log('═'.repeat(60));
    fields.forEach((field, index) => {
      console.log(`${index + 1}. ${field.label}`);
      console.log(`   Type: ${field.type}`);
      console.log(`   Position: (${field.x}%, ${field.y}%)`);
      console.log(`   Size: ${field.width}% x ${field.height}%`);
      console.log(`   Page: ${field.page}`);
      console.log('');
    });

    console.log('═'.repeat(60));
    console.log(`\n🎉 Added ${fields.length} signature fields!\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Get sign request ID from command line or use latest
const signRequestId = process.argv[2] ? parseInt(process.argv[2]) : null;

if (!signRequestId) {
  // Get latest sign request
  (async () => {
    const latest = await prisma.sign_requests.findFirst({
      orderBy: { id: 'desc' },
    });
    
    if (latest) {
      console.log(`\n🔍 Using latest sign request: ${latest.id}\n`);
      await addSignatureFields(latest.id);
    } else {
      console.log('❌ No sign requests found');
    }
    
    await prisma.$disconnect();
  })();
} else {
  addSignatureFields(signRequestId);
}
