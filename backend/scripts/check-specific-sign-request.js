const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSignRequest(signRequestId) {
  try {
    console.log(`🔍 Checking Sign Request #${signRequestId}\n`);

    const sr = await prisma.sign_requests.findUnique({
      where: { id: signRequestId },
      include: {
        document: true,
        signers: {
          orderBy: {
            signing_order: 'asc'
          }
        }
      }
    });

    if (!sr) {
      console.log('❌ Sign request not found');
      return;
    }

    console.log('📄 Sign Request Details:');
    console.log(`   ID: ${sr.id}`);
    console.log(`   Status: ${sr.status}`);
    console.log(`   Workflow Type: ${sr.workflow_type}`);
    console.log(`   Created: ${sr.created_at.toLocaleString('vi-VN')}`);
    console.log(`\n📄 Document:`);
    console.log(`   ID: ${sr.document.id}`);
    console.log(`   Title: ${sr.document.title}`);
    console.log(`   Number: ${sr.document.document_number}`);
    console.log(`   Status: ${sr.document.status}`);
    
    console.log(`\n👥 Signers (${sr.signers.length}):`);
    sr.signers.forEach((signer, idx) => {
      console.log(`\n   ${idx + 1}. ${signer.name} (${signer.email})`);
      console.log(`      ID: ${signer.id}`);
      console.log(`      Order: ${signer.signing_order}`);
      console.log(`      Status: ${signer.status}`);
      console.log(`      Signed At: ${signer.signed_at ? signer.signed_at.toLocaleString('vi-VN') : 'Not yet'}`);
      console.log(`      Has Token: ${signer.signing_token ? 'Yes' : 'No'}`);
      console.log(`      Signature Data: ${signer.signature_data ? 'Yes' : 'No'}`);
      console.log(`      Signature Type: ${signer.signature_type || 'N/A'}`);
      console.log(`      IP: ${signer.ip_address || 'N/A'}`);
    });

    // Check what should happen next
    console.log(`\n🔍 Analysis:`);
    const completedSigners = sr.signers.filter(s => s.status === 'completed' || s.status === 'signed');
    const pendingSigners = sr.signers.filter(s => s.status === 'pending');
    
    console.log(`   Completed: ${completedSigners.length}/${sr.signers.length}`);
    console.log(`   Pending: ${pendingSigners.length}`);
    
    if (sr.workflow_type === 'sequential') {
      const sortedSigners = [...sr.signers].sort((a, b) => 
        (a.signing_order || 0) - (b.signing_order || 0)
      );
      
      console.log(`\n   Sequential Order:`);
      sortedSigners.forEach((s, idx) => {
        const icon = s.status === 'completed' || s.status === 'signed' ? '✅' : '⏳';
        console.log(`   ${idx + 1}. ${icon} Order ${s.signing_order}: ${s.name} - ${s.status}`);
      });
      
      const nextSigner = sortedSigners.find(s => s.status === 'pending');
      if (nextSigner) {
        console.log(`\n   ⏭️  Next to sign: ${nextSigner.name} (Order: ${nextSigner.signing_order})`);
      } else if (completedSigners.length === sr.signers.length) {
        console.log(`\n   ✅ All signers completed!`);
        console.log(`   ⚠️  Sign request status should be: completed`);
        console.log(`   ⚠️  Document status should be: completed`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get sign request ID from command line or use default
const signRequestId = parseInt(process.argv[2]) || 40;
checkSignRequest(signRequestId);
