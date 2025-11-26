/**
 * Test Sign Requests UI Integration
 * Verify internal vs external signer logic
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing Sign Requests UI Integration\n');

  try {
    // 1. Find document 101 (001/2025)
    console.log('📄 Step 1: Check Document 101');
    const document = await prisma.documents.findUnique({
      where: { id: 101 },
      include: {
        sign_request: {
          include: {
            signers: true
          }
        }
      }
    });

    if (!document) {
      console.log('❌ Document 101 not found');
      return;
    }

    console.log(`✅ Document: ${document.document_number}`);
    console.log(`   Sign Request ID: ${document.sign_request?.id}`);
    console.log(`   Status: ${document.sign_request?.status}\n`);

    // 2. Check signers
    console.log('👥 Step 2: Check Signers');
    const signers = document.sign_request?.signers || [];
    
    signers.forEach((signer, index) => {
      console.log(`\nSigner ${index + 1}:`);
      console.log(`  ID: ${signer.id}`);
      console.log(`  Name: ${signer.name}`);
      console.log(`  Email: ${signer.email}`);
      console.log(`  is_internal: ${signer.is_internal}`);
      console.log(`  user_id: ${signer.user_id}`);
      console.log(`  status: ${signer.status}`);
      console.log(`  signing_order: ${signer.signing_order}`);
      console.log(`  signed_at: ${signer.signed_at}`);
    });

    // 3. Test UI logic
    console.log('\n\n🎯 Step 3: Test UI Logic\n');

    // Test for admin user (ID: 1)
    const adminUserId = 1;
    console.log(`Testing for admin user (ID: ${adminUserId}):`);
    
    const adminSigner = signers.find(s => s.user_id === adminUserId);
    if (adminSigner) {
      console.log(`✅ Admin is a signer`);
      console.log(`   Status: ${adminSigner.status}`);
      console.log(`   Order: ${adminSigner.signing_order}`);
      
      const isPending = adminSigner.status === 'pending' || adminSigner.status === 'otp_sent';
      console.log(`   Is pending: ${isPending}`);
      
      // Check if it's admin's turn
      const previousSigners = signers.filter(
        s => (s.signing_order || 0) < (adminSigner.signing_order || 0)
      );
      const allPreviousSigned = previousSigners.every(
        s => s.status === 'signed' || s.status === 'completed'
      );
      console.log(`   Previous signers: ${previousSigners.length}`);
      console.log(`   All previous signed: ${allPreviousSigned}`);
      console.log(`   Is admin's turn: ${allPreviousSigned}`);
      
      if (isPending && allPreviousSigned) {
        console.log(`\n   ✅ SHOW "Ký ngay" BUTTON for admin`);
      } else {
        console.log(`\n   ❌ HIDE "Ký ngay" button (not admin's turn yet)`);
      }
    } else {
      console.log(`❌ Admin is NOT a signer`);
    }

    // Test for approver user (ID: 17)
    const approverUserId = 17;
    console.log(`\n\nTesting for approver user (ID: ${approverUserId}):`);
    
    const approverSigner = signers.find(s => s.user_id === approverUserId);
    if (approverSigner) {
      console.log(`✅ Approver is a signer`);
      console.log(`   Status: ${approverSigner.status}`);
      console.log(`   Order: ${approverSigner.signing_order}`);
      
      const isPending = approverSigner.status === 'pending' || approverSigner.status === 'otp_sent';
      console.log(`   Is pending: ${isPending}`);
      
      // Check if it's approver's turn
      const previousSigners = signers.filter(
        s => (s.signing_order || 0) < (approverSigner.signing_order || 0)
      );
      const allPreviousSigned = previousSigners.every(
        s => s.status === 'signed' || s.status === 'completed'
      );
      console.log(`   Previous signers: ${previousSigners.length}`);
      console.log(`   All previous signed: ${allPreviousSigned}`);
      console.log(`   Is approver's turn: ${allPreviousSigned}`);
      
      if (isPending && allPreviousSigned) {
        console.log(`\n   ✅ SHOW "Ký ngay" BUTTON for approver`);
      } else {
        console.log(`\n   ❌ HIDE "Ký ngay" button (not approver's turn yet)`);
      }
    } else {
      console.log(`❌ Approver is NOT a signer`);
    }

    // 4. Check external signers
    console.log('\n\n🌐 Step 4: Check External Signers');
    const externalSigners = signers.filter(s => !s.is_internal);
    
    if (externalSigners.length > 0) {
      console.log(`✅ Has ${externalSigners.length} external signer(s)`);
      console.log(`   → SHOW copy link & resend email buttons`);
      externalSigners.forEach(s => {
        console.log(`   - ${s.name} (${s.email})`);
      });
    } else {
      console.log(`❌ No external signers`);
      console.log(`   → HIDE copy link & resend email buttons`);
    }

    // 5. Summary
    console.log('\n\n📊 Summary:');
    console.log(`Total signers: ${signers.length}`);
    console.log(`Internal signers: ${signers.filter(s => s.is_internal).length}`);
    console.log(`External signers: ${signers.filter(s => !s.is_internal).length}`);
    console.log(`Signed: ${signers.filter(s => s.status === 'signed').length}`);
    console.log(`Pending: ${signers.filter(s => s.status === 'pending' || s.status === 'otp_sent').length}`);

    console.log('\n✅ Test completed!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
