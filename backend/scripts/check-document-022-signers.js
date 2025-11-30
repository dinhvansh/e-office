const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDocument022() {
  console.log('\n🔍 Checking Document 022/2025\n');
  
  try {
    // Find document by number
    const document = await prisma.documents.findFirst({
      where: { document_number: '022/2025' },
      include: {
        sign_request: {
          include: {
            signers: {
              orderBy: { signing_order: 'asc' }
            }
          }
        }
      }
    });

    if (!document) {
      console.log('❌ Document 022/2025 not found');
      return;
    }

    console.log('📄 Document Info:');
    console.log('  ID:', document.id);
    console.log('  Title:', document.title);
    console.log('  Status:', document.status);
    console.log('  Sign Request ID:', document.sign_request_id);

    if (!document.sign_request) {
      console.log('\n❌ No sign request found');
      return;
    }

    const signRequest = document.sign_request;
    console.log('\n📝 Sign Request:');
    console.log('  ID:', signRequest.id);
    console.log('  Status:', signRequest.status);
    console.log('  Signers:', signRequest.signers.length);

    console.log('\n👥 Signers Details:');
    signRequest.signers.forEach((signer, i) => {
      console.log(`\n  ${i + 1}. ${signer.name} (${signer.email})`);
      console.log(`     Order: ${signer.signing_order}`);
      console.log(`     Is Internal: ${signer.is_internal}`);
      console.log(`     Status: ${signer.status}`);
      console.log(`     Has Token: ${signer.signing_token ? 'Yes' : 'No'}`);
      console.log(`     Has OTP: ${signer.otp ? 'Yes' : 'No'}`);
      console.log(`     OTP Expire: ${signer.otp_expire || 'N/A'}`);
      console.log(`     Signed At: ${signer.signed_at || 'Not signed'}`);
      
      if (signer.signing_token) {
        console.log(`     Signing URL: http://localhost:3000/sign/${signer.signing_token}`);
      }
    });

    // Check which signers should receive email
    console.log('\n📧 Email Status:');
    const pendingSigners = signRequest.signers.filter(s => s.status === 'pending');
    const waitingSigners = signRequest.signers.filter(s => s.status === 'waiting_signing');
    
    console.log(`  Pending signers (should receive email): ${pendingSigners.length}`);
    pendingSigners.forEach(s => {
      console.log(`    - ${s.name} (${s.email}) - Internal: ${s.is_internal}`);
      if (!s.is_internal && s.signing_token) {
        console.log(`      ✅ Should receive email`);
      } else if (s.is_internal) {
        console.log(`      ⚠️  Internal signer - No email sent`);
      } else {
        console.log(`      ❌ No token - Cannot send email`);
      }
    });
    
    console.log(`\n  Waiting signers (will receive email later): ${waitingSigners.length}`);
    waitingSigners.forEach(s => {
      console.log(`    - ${s.name} (${s.email})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocument022();
