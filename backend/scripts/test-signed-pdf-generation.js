const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSignedPdfGeneration() {
  console.log('\n🧪 Testing Signed PDF Generation\n');
  
  try {
    // Find a completed sign request
    const completedSignRequest = await prisma.sign_requests.findFirst({
      where: {
        status: 'completed'
      },
      include: {
        document: true,
        signers: {
          orderBy: { signing_order: 'asc' }
        }
      }
    });

    if (completedSignRequest) {
      console.log('✅ Found completed sign request:', completedSignRequest.id);
      console.log('   Document:', completedSignRequest.document.title);
      console.log('   Signed file path:', completedSignRequest.document.signed_file_path || 'Not generated yet');
      console.log('\n👥 Signers:');
      completedSignRequest.signers.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.name} - ${s.status} - ${s.signed_at ? 'Signed' : 'Not signed'}`);
      });
      
      if (!completedSignRequest.document.signed_file_path) {
        console.log('\n⚠️  Signed PDF not generated yet. Will be generated on next signing completion.');
      }
    } else {
      console.log('❌ No completed sign requests found');
      console.log('\n📊 Sign request statuses:');
      
      const allSignRequests = await prisma.sign_requests.findMany({
        take: 10,
        orderBy: { created_at: 'desc' },
        include: {
          document: {
            select: { id: true, title: true, document_number: true }
          },
          signers: {
            select: { status: true }
          }
        }
      });
      
      allSignRequests.forEach(sr => {
        const signedCount = sr.signers.filter(s => s.status === 'signed' || s.status === 'completed').length;
        console.log(`   SR ${sr.id}: ${sr.status} (${signedCount}/${sr.signers.length} signed) - ${sr.document.title}`);
      });
    }

    // Check if we have any sign requests close to completion
    console.log('\n🔍 Checking sign requests close to completion...');
    
    const inProgressSignRequests = await prisma.sign_requests.findMany({
      where: {
        status: 'in_progress'
      },
      include: {
        document: {
          select: { id: true, title: true, document_number: true }
        },
        signers: {
          orderBy: { signing_order: 'asc' }
        }
      },
      take: 5
    });

    for (const sr of inProgressSignRequests) {
      const signedCount = sr.signers.filter(s => s.status === 'signed' || s.status === 'completed').length;
      const totalCount = sr.signers.length;
      
      if (signedCount === totalCount - 1) {
        console.log(`\n⚠️  Sign Request ${sr.id} is almost complete!`);
        console.log(`   Document: ${sr.document.title}`);
        console.log(`   Progress: ${signedCount}/${totalCount} signed`);
        console.log(`   Pending signers:`);
        
        sr.signers.forEach(s => {
          if (s.status !== 'signed' && s.status !== 'completed') {
            console.log(`     - ${s.name} (${s.email}) - Order: ${s.signing_order}`);
            if (s.signing_token) {
              console.log(`       Signing URL: http://localhost:3000/sign/${s.signing_token}`);
            }
          }
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testSignedPdfGeneration();
