const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getValidTokens() {
  console.log('🔍 Finding valid signing tokens...\n');

  try {
    const signers = await prisma.signers.findMany({
      take: 5,
      orderBy: { id: 'desc' },
      include: {
        sign_request: {
          include: {
            document: {
              select: {
                title: true,
              }
            }
          }
        }
      }
    });

    console.log('📋 Available signing tokens:');
    signers.forEach((signer, index) => {
      console.log(`${index + 1}. Token: ${signer.signing_token}`);
      console.log(`   Status: ${signer.status}`);
      console.log(`   Email: ${signer.email}`);
      console.log(`   Document: ${signer.sign_request.document?.title || 'N/A'}`);
      console.log(`   Signed at: ${signer.signed_at || 'Not signed'}`);
      console.log('');
    });

    // Find one pending and one completed
    const pending = signers.find(s => s.status === 'pending');
    const completed = signers.find(s => s.status === 'completed');

    console.log('🎯 Recommended tokens for testing:');
    if (pending) {
      console.log(`📝 Pending (for fresh signing): ${pending.signing_token}`);
    }
    if (completed) {
      console.log(`✅ Completed (for thank you page): ${completed.signing_token}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getValidTokens();