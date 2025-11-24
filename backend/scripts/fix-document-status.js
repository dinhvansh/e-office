const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDocumentStatus(documentId) {
  try {
    console.log(`🔧 Fixing Document #${documentId} Status\n`);

    const doc = await prisma.documents.findUnique({
      where: { id: documentId },
      include: {
        sign_request: {
          include: {
            signers: true
          }
        }
      }
    });

    if (!doc) {
      console.log('❌ Document not found');
      return;
    }

    console.log('📄 Current Status:');
    console.log(`   Document: ${doc.status}`);
    console.log(`   Sign Request: ${doc.sign_request?.status || 'N/A'}`);

    // Check if should be pending_signature
    if (doc.sign_request && doc.sign_request.status === 'pending' && doc.status !== 'pending_signature') {
      console.log('\n🔧 Updating document status to pending_signature...');
      
      await prisma.documents.update({
        where: { id: documentId },
        data: { status: 'pending_signature' }
      });

      console.log('✅ Document status updated!');
    } else {
      console.log('\n✅ Document status is already correct or no action needed');
    }

    // Verify
    const updated = await prisma.documents.findUnique({
      where: { id: documentId }
    });

    console.log('\n📄 New Status:');
    console.log(`   Document: ${updated?.status}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const documentId = parseInt(process.argv[2]) || 96;
fixDocumentStatus(documentId);
