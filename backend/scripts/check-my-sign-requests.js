/**
 * Check sign requests for current user (approver)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking sign requests for approver user\n');

  try {
    // Find approver user
    const approver = await prisma.users.findFirst({
      where: { email: 'approver@acme.local' }
    });

    if (!approver) {
      console.log('❌ Approver user not found');
      return;
    }

    console.log(`✅ Found user: ${approver.full_name || approver.email} (ID: ${approver.id})\n`);

    // Find sign requests where approver is a signer
    const signRequests = await prisma.sign_requests.findMany({
      where: {
        signers: {
          some: {
            user_id: approver.id,
            is_internal: true
          }
        }
      },
      include: {
        document: {
          select: {
            id: true,
            document_number: true,
            title: true,
            original_file_name: true
          }
        },
        signers: {
          where: {
            user_id: approver.id
          },
          select: {
            id: true,
            status: true,
            signing_order: true,
            signed_at: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    console.log(`📋 Found ${signRequests.length} sign requests for approver\n`);

    if (signRequests.length === 0) {
      console.log('⚠️ No sign requests found for this user');
      console.log('   User might not be added as signer in any sign request');
      return;
    }

    // Display each sign request
    signRequests.forEach((sr, index) => {
      console.log(`\n${index + 1}. Sign Request #${sr.id}`);
      console.log(`   Document: ${sr.document.document_number || sr.document.title || sr.document.original_file_name}`);
      console.log(`   Status: ${sr.status}`);
      console.log(`   Approver's signer info:`);
      sr.signers.forEach(signer => {
        console.log(`     - Signer ID: ${signer.id}`);
        console.log(`       Status: ${signer.status}`);
        console.log(`       Order: ${signer.signing_order}`);
        console.log(`       Signed at: ${signer.signed_at || 'Not signed yet'}`);
      });
    });

    // Check which ones approver can sign now
    console.log('\n\n🎯 Sign Requests Approver Can Sign Now:\n');

    for (const sr of signRequests) {
      const approverSigner = sr.signers[0];
      
      if (approverSigner.status === 'signed' || approverSigner.status === 'completed') {
        console.log(`❌ Sign Request #${sr.id}: Already signed`);
        continue;
      }

      // Get all signers to check order
      const allSigners = await prisma.signers.findMany({
        where: { sign_request_id: sr.id },
        orderBy: { signing_order: 'asc' }
      });

      const previousSigners = allSigners.filter(
        s => (s.signing_order || 0) < (approverSigner.signing_order || 0)
      );

      const allPreviousSigned = previousSigners.every(
        s => s.status === 'signed' || s.status === 'completed'
      );

      if (allPreviousSigned) {
        console.log(`✅ Sign Request #${sr.id}: CAN SIGN NOW!`);
        console.log(`   Document: ${sr.document.document_number}`);
        console.log(`   URL: http://localhost:3000/sign-requests/${sr.id}/sign`);
      } else {
        console.log(`⏳ Sign Request #${sr.id}: Waiting for previous signers`);
        console.log(`   Previous signers: ${previousSigners.length}`);
        console.log(`   Signed: ${previousSigners.filter(s => s.status === 'signed').length}`);
      }
    }

    console.log('\n✅ Check completed!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
