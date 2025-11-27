/**
 * Get signing URL for external signer
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'info@abc.com.vn';
  
  console.log(`🔍 Getting Signing URL for ${email}\n`);
  
  // Find signer
  const signers = await prisma.signers.findMany({
    where: {
      email: email,
      is_internal: false
    },
    include: {
      sign_request: {
        include: {
          document: {
            select: {
              id: true,
              title: true,
              document_number: true,
              original_file_name: true
            }
          }
        }
      }
    },
    orderBy: {
      id: 'desc'
    }
  });
  
  if (signers.length === 0) {
    console.error('❌ No signers found for this email');
    return;
  }
  
  console.log(`Found ${signers.length} signing requests:\n`);
  
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  signers.forEach((signer, i) => {
    console.log(`${i + 1}. Sign Request #${signer.sign_request_id}`);
    console.log(`   Document: ${signer.sign_request.document?.title || signer.sign_request.document?.original_file_name || 'Untitled'}`);
    console.log(`   Document Number: ${signer.sign_request.document?.document_number || 'N/A'}`);
    console.log(`   Status: ${signer.status}`);
    console.log(`   Signing Order: ${signer.signing_order || 'N/A'}`);
    
    if (signer.signing_token) {
      const signUrl = `${frontendUrl}/sign/${signer.signing_token}`;
      console.log(`   ✅ Signing URL: ${signUrl}`);
    } else {
      console.log(`   ⚠️  No signing token yet (document not sent)`);
    }
    
    console.log('');
  });
  
  // Show most recent one prominently
  if (signers[0].signing_token) {
    const latestUrl = `${frontendUrl}/sign/${signers[0].signing_token}`;
    console.log('📋 LATEST SIGNING URL (copy this):');
    console.log(`\n${latestUrl}\n`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
