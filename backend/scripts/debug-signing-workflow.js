const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugSigningWorkflow() {
  try {
    console.log('🔍 Debugging Signing Workflow\n');

    // Get recent sign requests
    const signRequests = await prisma.sign_requests.findMany({
      where: {
        status: {
          in: ['pending', 'in_progress']
        }
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            document_number: true,
            status: true
          }
        },
        signers: {
          orderBy: {
            signing_order: 'asc'
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 5
    });

    console.log(`Found ${signRequests.length} active sign requests\n`);

    for (const sr of signRequests) {
      console.log('━'.repeat(60));
      console.log(`📄 Sign Request #${sr.id}`);
      console.log(`   Document: ${sr.document.title || sr.document.document_number}`);
      console.log(`   Status: ${sr.status}`);
      console.log(`   Document Status: ${sr.document.status}`);
      console.log(`   Workflow Type: ${sr.workflow_type}`);
      console.log(`   Created: ${sr.created_at.toLocaleString('vi-VN')}`);
      console.log(`\n   Signers (${sr.signers.length}):`);
      
      sr.signers.forEach((signer, idx) => {
        const statusIcon = signer.status === 'completed' ? '✅' : 
                          signer.status === 'signed' ? '✅' :
                          signer.status === 'pending' ? '⏳' : '❌';
        console.log(`   ${idx + 1}. ${statusIcon} ${signer.name} (${signer.email})`);
        console.log(`      Order: ${signer.signing_order || 'N/A'}`);
        console.log(`      Status: ${signer.status}`);
        console.log(`      Signed At: ${signer.signed_at ? signer.signed_at.toLocaleString('vi-VN') : 'Not yet'}`);
        console.log(`      Has Token: ${signer.signing_token ? 'Yes' : 'No'}`);
      });

      // Check workflow logic
      const completedSigners = sr.signers.filter(s => s.status === 'completed' || s.status === 'signed');
      const pendingSigners = sr.signers.filter(s => s.status === 'pending');
      
      console.log(`\n   Progress: ${completedSigners.length}/${sr.signers.length} signed`);
      
      if (sr.workflow_type === 'sequential') {
        const sortedSigners = [...sr.signers].sort((a, b) => 
          (a.signing_order || 0) - (b.signing_order || 0)
        );
        
        const nextSigner = sortedSigners.find(s => s.status === 'pending');
        if (nextSigner) {
          console.log(`   ⏭️  Next Signer: ${nextSigner.name} (Order: ${nextSigner.signing_order})`);
        } else if (completedSigners.length === sr.signers.length) {
          console.log(`   ✅ All signers completed!`);
        }
      }
      
      console.log('');
    }

    console.log('━'.repeat(60));
    console.log('\n✅ Debug complete');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSigningWorkflow();
