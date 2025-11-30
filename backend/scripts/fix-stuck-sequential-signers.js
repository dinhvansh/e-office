const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Fix Stuck Sequential Signers
 * Activate next signers who should be pending but are still waiting_signing
 */

async function fixStuckSequentialSigners() {
  console.log('🔧 Fixing Stuck Sequential Signers\n');

  try {
    // Find all sequential sign requests that are in progress
    const signRequests = await prisma.sign_requests.findMany({
      where: {
        workflow_type: 'sequential',
        status: {
          in: ['pending', 'in_progress']
        }
      },
      include: {
        signers: {
          orderBy: { signing_order: 'asc' }
        },
        document: {
          select: {
            id: true,
            document_number: true,
            title: true
          }
        }
      }
    });

    console.log(`📊 Found ${signRequests.length} sequential sign requests\n`);

    let fixedCount = 0;

    for (const signRequest of signRequests) {
      console.log(`\n📄 Sign Request #${signRequest.id}: ${signRequest.document.document_number}`);
      console.log(`   Title: ${signRequest.title}`);
      
      let needsFix = false;
      const fixes = [];

      // Check each signer
      for (let i = 0; i < signRequest.signers.length; i++) {
        const signer = signRequest.signers[i];
        const previousSigner = i > 0 ? signRequest.signers[i - 1] : null;

        // Check if previous signer is done
        const prevSigned = previousSigner && 
          (previousSigner.status === 'signed' || previousSigner.status === 'completed');

        // If this is first signer or previous is signed, this should be pending
        if (i === 0 || prevSigned) {
          if (signer.status === 'waiting_signing') {
            needsFix = true;
            fixes.push({
              signer,
              from: 'waiting_signing',
              to: 'pending',
              reason: i === 0 ? 'First signer' : 'Previous signer completed'
            });
          }
        }
      }

      if (needsFix) {
        console.log(`   ⚠️  Found ${fixes.length} signer(s) to fix:`);
        
        for (const fix of fixes) {
          console.log(`      - ${fix.signer.name} (order ${fix.signer.signing_order})`);
          console.log(`        ${fix.from} → ${fix.to} (${fix.reason})`);
          
          // Update signer status
          await prisma.signers.update({
            where: { id: fix.signer.id },
            data: { status: fix.to }
          });
          
          // Send notification if internal user
          if (fix.signer.is_internal && fix.signer.user_id) {
            try {
              await prisma.notifications.create({
                data: {
                  tenant_id: signRequest.document.tenant_id || 1,
                  user_id: fix.signer.user_id,
                  type: 'sign_request_received',
                  title: 'Đến lượt bạn ký tài liệu',
                  message: `Tài liệu "${signRequest.title || 'Untitled'}" đang chờ bạn ký`,
                  metadata: {
                    sign_request_id: signRequest.id,
                    document_id: signRequest.document_id
                  },
                  is_read: false
                }
              });
              console.log(`        ✅ Notification sent`);
            } catch (error) {
              console.log(`        ⚠️  Failed to send notification: ${error.message}`);
            }
          }
        }
        
        fixedCount++;
        console.log(`   ✅ Fixed!`);
      } else {
        console.log(`   ✅ No issues found`);
      }
    }

    console.log(`\n\n📋 Summary:`);
    console.log(`   Total sign requests checked: ${signRequests.length}`);
    console.log(`   Sign requests fixed: ${fixedCount}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

fixStuckSequentialSigners();
