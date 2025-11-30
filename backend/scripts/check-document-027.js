const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Checking document 027/2025...\n');

    const doc = await prisma.documents.findFirst({
      where: {
        document_number: {
          contains: '027/2025'
        }
      },
      include: {
        document_type: true,
        owner: true
      }
    });

    if (!doc) {
      console.log('❌ Document not found');
      return;
    }

    console.log('📄 Document found:');
    console.log('  ID:', doc.id);
    console.log('  Number:', doc.document_number);
    console.log('  Title:', doc.title);
    console.log('  Status:', doc.status);
    console.log('  Owner:', doc.owner?.full_name);
    console.log('');

    // Find sign requests
    const signRequests = await prisma.sign_requests.findMany({
      where: {
        document_id: doc.id
      },
      include: {
        signers: {
          include: {
            user: true
          },
          orderBy: {
            signing_order: 'asc'
          }
        },
        fields: {
          orderBy: {
            id: 'asc'
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    console.log(`📝 Found ${signRequests.length} sign request(s)\n`);

    for (const sr of signRequests) {
      console.log('='.repeat(80));
      console.log(`Sign Request #${sr.id}`);
      console.log('='.repeat(80));
      console.log('Status:', sr.status);
      console.log('Mode:', sr.mode);
      console.log('Created:', sr.created_at);
      console.log('Sent:', sr.sent_at);
      console.log('');

      console.log(`📋 Fields (${sr.fields.length}):`);
      sr.fields.forEach((field, idx) => {
        console.log(`  ${idx + 1}. ID ${field.id}: ${field.type} - Page ${field.page}`);
        console.log(`     Position: (${field.x}, ${field.y}), Size: ${field.width}x${field.height}`);
        console.log(`     Signer ID: ${field.assigned_signer_id || 'N/A'}`);
      });
      console.log('');

      console.log(`👥 Signers (${sr.signers.length}):`);
      sr.signers.forEach((signer, idx) => {
        const name = signer.user?.full_name || signer.name || signer.email;
        console.log(`  ${idx + 1}. [Order ${signer.signing_order}] ${name}`);
        console.log(`     Type: ${signer.is_internal ? 'internal' : 'external'}`);
        console.log(`     Status: ${signer.status}`);
        console.log(`     Email: ${signer.email || 'N/A'}`);
        console.log(`     Signed at: ${signer.signed_at || 'Not signed'}`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
