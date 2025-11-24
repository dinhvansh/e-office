const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSignerStatus() {
  try {
    console.log('🔧 Fixing Signer Status\n');

    // Find signers who have signed but status is not 'completed' or 'signed'
    const brokenSigners = await prisma.signers.findMany({
      where: {
        AND: [
          {
            status: {
              notIn: ['completed', 'signed']
            }
          },
          {
            signature_data: {
              not: null
            }
          },
          {
            signed_at: {
              not: null
            }
          }
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

    console.log(`Found ${brokenSigners.length} signers with incorrect status\n`);

    if (brokenSigners.length === 0) {
      console.log('✅ No broken signers found. All good!');
      return;
    }

    for (const signer of brokenSigners) {
      console.log(`🔧 Fixing Signer #${signer.id}:`);
      console.log(`   Name: ${signer.name}`);
      console.log(`   Email: ${signer.email}`);
      console.log(`   Current Status: ${signer.status}`);
      console.log(`   Signed At: ${signer.signed_at.toLocaleString('vi-VN')}`);
      console.log(`   Has Signature: ${signer.signature_data ? 'Yes' : 'No'}`);
      console.log(`   Sign Request: #${signer.sign_request_id}`);
      console.log(`   Document: ${signer.sign_request.document.document_number || signer.sign_request.document.title}`);

      // Update status to 'signed'
      await prisma.signers.update({
        where: { id: signer.id },
        data: { status: 'signed' }
      });

      console.log(`   ✅ Updated to: signed\n`);
    }

    console.log('━'.repeat(60));
    console.log('\n🔍 Now checking sign requests that should be completed...\n');

    // Get all affected sign requests
    const affectedSignRequestIds = [...new Set(brokenSigners.map(s => s.sign_request_id))];

    for (const srId of affectedSignRequestIds) {
      const sr = await prisma.sign_requests.findUnique({
        where: { id: srId },
        include: {
          signers: true,
          document: true
        }
      });

      if (!sr) continue;

      console.log(`📄 Sign Request #${sr.id}:`);
      console.log(`   Document: ${sr.document.document_number || sr.document.title}`);
      console.log(`   Current Status: ${sr.status}`);

      const allSigners = sr.signers;
      const signedCount = allSigners.filter(s => s.status === 'completed' || s.status === 'signed').length;
      const allSigned = allSigners.every(s => s.status === 'completed' || s.status === 'signed');

      console.log(`   Progress: ${signedCount}/${allSigners.length} signed`);

      if (allSigned && sr.status !== 'completed') {
        console.log(`   ✅ All signers completed! Updating sign request...`);
        
        await prisma.sign_requests.update({
          where: { id: sr.id },
          data: { status: 'completed' }
        });

        await prisma.documents.update({
          where: { id: sr.document_id },
          data: { status: 'completed' }
        });

        console.log(`   ✅ Sign request and document marked as completed`);
      } else if (signedCount > 0 && sr.status === 'pending') {
        console.log(`   ⏳ Some signed, updating to in_progress...`);
        
        await prisma.sign_requests.update({
          where: { id: sr.id },
          data: { status: 'in_progress' }
        });

        console.log(`   ✅ Sign request marked as in_progress`);
      } else {
        console.log(`   ℹ️  Status is correct: ${sr.status}`);
      }

      console.log('');
    }

    console.log('━'.repeat(60));
    console.log('\n✅ All fixes applied!');
    console.log(`\nSummary:`);
    console.log(`   Fixed ${brokenSigners.length} signers`);
    console.log(`   Checked ${affectedSignRequestIds.length} sign requests`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSignerStatus();
