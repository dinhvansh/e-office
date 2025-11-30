const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Test Sequential Signing Activation
 * Verify that when signer 1 completes, signer 2 is automatically activated
 */

async function testSequentialSigningActivation() {
  console.log('🧪 Testing Sequential Signing Activation\n');

  try {
    // Find a sign request with sequential workflow and multiple signers
    const signRequest = await prisma.sign_requests.findFirst({
      where: {
        workflow_type: 'sequential',
        status: {
          in: ['draft', 'pending', 'in_progress']
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
            title: true,
            status: true
          }
        }
      }
    });

    if (!signRequest) {
      console.log('❌ No sequential sign request found');
      return;
    }

    console.log('📄 Sign Request:', {
      id: signRequest.id,
      title: signRequest.title,
      workflow_type: signRequest.workflow_type,
      status: signRequest.status,
      document: signRequest.document.document_number
    });

    console.log('\n👥 Signers:');
    signRequest.signers.forEach(signer => {
      console.log(`  ${signer.signing_order}. ${signer.name} (${signer.email})`);
      console.log(`     Status: ${signer.status}`);
      console.log(`     Internal: ${signer.is_internal}`);
      console.log(`     User ID: ${signer.user_id || 'N/A'}`);
    });

    // Check current state
    const signedSigners = signRequest.signers.filter(s => 
      s.status === 'signed' || s.status === 'completed'
    );
    const pendingSigners = signRequest.signers.filter(s => s.status === 'pending');
    const waitingSigners = signRequest.signers.filter(s => s.status === 'waiting_signing');

    console.log('\n📊 Current State:');
    console.log(`  ✅ Signed: ${signedSigners.length}`);
    console.log(`  ⏳ Pending: ${pendingSigners.length}`);
    console.log(`  ⏸️  Waiting: ${waitingSigners.length}`);

    // Test scenarios
    console.log('\n🧪 Test Scenarios:\n');

    // Scenario 1: Check if first signer is pending
    const firstSigner = signRequest.signers[0];
    if (firstSigner.status === 'pending' || firstSigner.status === 'otp_sent') {
      console.log('✅ Scenario 1: First signer is ready to sign');
    } else if (firstSigner.status === 'signed' || firstSigner.status === 'completed') {
      console.log('✅ Scenario 1: First signer already signed');
    } else {
      console.log(`⚠️  Scenario 1: First signer has unexpected status: ${firstSigner.status}`);
    }

    // Scenario 2: Check if subsequent signers are waiting
    if (signRequest.signers.length > 1) {
      const secondSigner = signRequest.signers[1];
      
      if (firstSigner.status === 'signed' || firstSigner.status === 'completed') {
        // First signer done, second should be pending
        if (secondSigner.status === 'pending' || secondSigner.status === 'otp_sent') {
          console.log('✅ Scenario 2: Second signer activated after first completed');
        } else {
          console.log(`❌ Scenario 2: Second signer should be pending but is ${secondSigner.status}`);
        }
      } else {
        // First signer not done, second should be waiting
        if (secondSigner.status === 'waiting_signing') {
          console.log('✅ Scenario 2: Second signer waiting for first to complete');
        } else if (secondSigner.status === 'pending' || secondSigner.status === 'otp_sent') {
          console.log('⚠️  Scenario 2: Second signer is pending but first not done yet');
        } else {
          console.log(`⚠️  Scenario 2: Second signer has unexpected status: ${secondSigner.status}`);
        }
      }
    }

    // Scenario 3: Check activation chain
    console.log('\n🔗 Activation Chain:');
    for (let i = 0; i < signRequest.signers.length; i++) {
      const signer = signRequest.signers[i];
      const previousSigner = i > 0 ? signRequest.signers[i - 1] : null;
      
      let chainStatus = '✅';
      let reason = '';

      if (i === 0) {
        // First signer should be pending or signed
        if (!['pending', 'otp_sent', 'signed', 'completed'].includes(signer.status)) {
          chainStatus = '❌';
          reason = `should be pending/signed but is ${signer.status}`;
        }
      } else {
        // Subsequent signers
        const prevSigned = previousSigner && 
          (previousSigner.status === 'signed' || previousSigner.status === 'completed');
        
        if (prevSigned) {
          // Previous signed, this should be pending or signed
          if (!['pending', 'otp_sent', 'signed', 'completed'].includes(signer.status)) {
            chainStatus = '❌';
            reason = `previous signed, should be pending/signed but is ${signer.status}`;
          }
        } else {
          // Previous not signed, this should be waiting
          if (signer.status !== 'waiting_signing' && 
              signer.status !== 'signed' && 
              signer.status !== 'completed') {
            chainStatus = '⚠️';
            reason = `previous not signed, should be waiting but is ${signer.status}`;
          }
        }
      }

      console.log(`  ${chainStatus} Order ${signer.signing_order}: ${signer.name} - ${signer.status} ${reason}`);
    }

    // Summary
    console.log('\n📋 Summary:');
    const isValid = signRequest.signers.every((signer, i) => {
      if (i === 0) {
        return ['pending', 'otp_sent', 'signed', 'completed'].includes(signer.status);
      }
      const prevSigner = signRequest.signers[i - 1];
      const prevSigned = prevSigner.status === 'signed' || prevSigner.status === 'completed';
      
      if (prevSigned) {
        return ['pending', 'otp_sent', 'signed', 'completed'].includes(signer.status);
      } else {
        return ['waiting_signing', 'signed', 'completed'].includes(signer.status);
      }
    });

    if (isValid) {
      console.log('✅ Sequential signing activation is working correctly!');
    } else {
      console.log('❌ Sequential signing activation has issues');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testSequentialSigningActivation();
