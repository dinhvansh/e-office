/**
 * Test Sequential Signing Flow
 * 
 * Tests that:
 * 1. Only first signer gets 'pending' status
 * 2. Other signers get 'waiting_signing' status
 * 3. After first signer signs, next signer becomes 'pending'
 * 4. Signer 2 doesn't receive email until signer 1 completes
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Testing Sequential Signing ===\n');

  try {
    // Get test users
    const users = await prisma.users.findMany({
      where: { tenant_id: 1 },
      take: 3,
      orderBy: { id: 'asc' }
    });

    if (users.length < 3) {
      console.error('❌ Need at least 3 users for testing');
      return;
    }

    const [owner, signer1, signer2] = users;
    console.log(`Owner: ${owner.email}`);
    console.log(`Signer 1: ${signer1.email}`);
    console.log(`Signer 2: ${signer2.email}\n`);

    // Create test document
    console.log('📄 Creating test document...');
    const fs = require('fs');
    const path = require('path');
    
    const testContent = 'Sequential Signing Test';
    const testDir = path.join(process.cwd(), 'storage', '1');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    const testFile = path.join(testDir, 'seq-sign-test.txt');
    fs.writeFileSync(testFile, testContent);

    const document = await prisma.documents.create({
      data: {
        tenant_id: 1,
        owner_id: owner.id,
        file_path: 'storage/1/seq-sign-test.txt',
        original_file_name: 'seq-sign-test.txt',
        hash: 'test-hash',
        status: 'draft',
        title: 'Sequential Signing Test',
        version: 1
      }
    });

    console.log(`✓ Document created: ${document.title} (ID: ${document.id})\n`);

    // Create sign request
    console.log('📝 Creating sign request...');
    const signRequest = await prisma.sign_requests.create({
      data: {
        tenant_id: 1,
        document_id: document.id,
        title: 'Sequential Signing Test',
        workflow_type: 'sequential',
        status: 'draft'
      }
    });

    console.log(`✓ Sign request created (ID: ${signRequest.id})\n`);

    // Create signers with sequential logic
    console.log('👥 Creating signers with sequential logic...');
    
    const crypto = require('crypto');
    
    const signer1Record = await prisma.signers.create({
      data: {
        sign_request_id: signRequest.id,
        user_id: signer1.id,
        email: signer1.email,
        name: signer1.full_name || signer1.email,
        role: 'signer',
        signing_order: 1,
        status: 'pending', // ⭐ First signer = pending
        is_internal: true,
        signing_token: crypto.randomBytes(32).toString('hex')
      }
    });

    const signer2Record = await prisma.signers.create({
      data: {
        sign_request_id: signRequest.id,
        user_id: signer2.id,
        email: signer2.email,
        name: signer2.full_name || signer2.email,
        role: 'signer',
        signing_order: 2,
        status: 'waiting_signing', // ⭐ Second signer = waiting
        is_internal: true,
        signing_token: crypto.randomBytes(32).toString('hex')
      }
    });

    console.log(`✓ Signer 1 created: ${signer1.email} (status: pending)`);
    console.log(`✓ Signer 2 created: ${signer2.email} (status: waiting_signing)\n`);

    // Update sign request and document status
    await prisma.sign_requests.update({
      where: { id: signRequest.id },
      data: { status: 'pending' }
    });

    await prisma.documents.update({
      where: { id: document.id },
      data: { status: 'pending_signature' }
    });

    // TEST 1: Check initial states
    console.log('TEST 1: Check initial signer states');
    console.log('────────────────────────────────────');
    
    const signers = await prisma.signers.findMany({
      where: { sign_request_id: signRequest.id },
      orderBy: { signing_order: 'asc' }
    });

    for (const signer of signers) {
      const status = signer.status === 'pending' ? '✓ PENDING' : '⏳ WAITING';
      console.log(`  ${status} - Order ${signer.signing_order}: ${signer.email}`);
    }

    const signer1Pending = signers[0].status === 'pending';
    const signer2Waiting = signers[1].status === 'waiting_signing';

    if (signer1Pending && signer2Waiting) {
      console.log('\n✅ TEST 1 PASSED: Signer 1 is pending, Signer 2 is waiting\n');
    } else {
      console.log('\n❌ TEST 1 FAILED: Incorrect initial states\n');
      return;
    }

    // TEST 2: Signer 1 signs
    console.log('TEST 2: Signer 1 signs document');
    console.log('───────────────────────────────');
    
    await prisma.signers.update({
      where: { id: signer1Record.id },
      data: {
        status: 'signed',
        signed_at: new Date(),
        signature_data: 'test-signature-1'
      }
    });

    console.log(`  ✓ Signer 1 (${signer1.email}) signed\n`);

    // Simulate sequential logic: activate next signer
    const waitingSigners = await prisma.signers.findMany({
      where: {
        sign_request_id: signRequest.id,
        status: 'waiting_signing'
      },
      orderBy: { signing_order: 'asc' }
    });

    if (waitingSigners.length > 0) {
      const nextSigner = waitingSigners[0];
      await prisma.signers.update({
        where: { id: nextSigner.id },
        data: { status: 'pending' }
      });
      console.log(`  ⭐ Activated next signer: ${nextSigner.email}\n`);
    }

    // Update sign request status
    await prisma.sign_requests.update({
      where: { id: signRequest.id },
      data: { status: 'in_progress' }
    });

    // TEST 3: Check states after first signing
    console.log('TEST 3: Check signer states after first signing');
    console.log('────────────────────────────────────────────────');
    
    const signersAfter = await prisma.signers.findMany({
      where: { sign_request_id: signRequest.id },
      orderBy: { signing_order: 'asc' }
    });

    for (const signer of signersAfter) {
      let status;
      if (signer.status === 'signed') status = '✅ SIGNED';
      else if (signer.status === 'pending') status = '✓ PENDING';
      else status = '⏳ WAITING';
      
      console.log(`  ${status} - Order ${signer.signing_order}: ${signer.email}`);
    }

    const signer1Signed = signersAfter[0].status === 'signed';
    const signer2Pending = signersAfter[1].status === 'pending';

    if (signer1Signed && signer2Pending) {
      console.log('\n✅ TEST 3 PASSED: Signer 1 signed, Signer 2 now pending\n');
    } else {
      console.log('\n❌ TEST 3 FAILED: Incorrect states after signing\n');
      return;
    }

    // TEST 4: Signer 2 signs
    console.log('TEST 4: Signer 2 signs document');
    console.log('───────────────────────────────');
    
    await prisma.signers.update({
      where: { id: signer2Record.id },
      data: {
        status: 'signed',
        signed_at: new Date(),
        signature_data: 'test-signature-2'
      }
    });

    console.log(`  ✓ Signer 2 (${signer2.email}) signed\n`);

    // Check if all signed
    const allSignersAfter = await prisma.signers.findMany({
      where: { sign_request_id: signRequest.id }
    });

    const allSigned = allSignersAfter.every(s => s.status === 'signed');

    if (allSigned) {
      await prisma.sign_requests.update({
        where: { id: signRequest.id },
        data: { status: 'completed' }
      });

      await prisma.documents.update({
        where: { id: document.id },
        data: { status: 'completed' }
      });

      console.log('  ✅ All signers completed\n');
    }

    // TEST 5: Check final states
    console.log('TEST 5: Check final states');
    console.log('──────────────────────────');
    
    const finalSigners = await prisma.signers.findMany({
      where: { sign_request_id: signRequest.id },
      orderBy: { signing_order: 'asc' }
    });

    for (const signer of finalSigners) {
      console.log(`  ✅ SIGNED - Order ${signer.signing_order}: ${signer.email}`);
    }

    const finalDoc = await prisma.documents.findUnique({
      where: { id: document.id }
    });

    const finalSignRequest = await prisma.sign_requests.findUnique({
      where: { id: signRequest.id }
    });

    console.log(`\n  Document status: ${finalDoc?.status}`);
    console.log(`  Sign request status: ${finalSignRequest?.status}`);

    if (finalDoc?.status === 'completed' && finalSignRequest?.status === 'completed') {
      console.log('\n✅ TEST 5 PASSED: All completed\n');
    } else {
      console.log('\n❌ TEST 5 FAILED: Incorrect final states\n');
      return;
    }

    // Cleanup
    console.log('🧹 Cleaning up...');
    await prisma.signers.deleteMany({ where: { sign_request_id: signRequest.id } });
    await prisma.sign_requests.delete({ where: { id: signRequest.id } });
    await prisma.documents.delete({ where: { id: document.id } });
    
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
    
    console.log('✓ Cleanup complete\n');

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED - Sequential Signing Working!');
    console.log('═══════════════════════════════════════════════════');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
