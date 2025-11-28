/**
 * Get Signing URL by Email
 * Usage: node scripts/get-signing-url-by-email.js contact@abc.com
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getSigningUrl() {
  const email = process.argv[2] || 'contact@abc.com';
  
  console.log(`\n🔍 Tìm signing URL cho: ${email}\n`);
  
  try {
    // Find signer by email
    const signers = await prisma.signers.findMany({
      where: {
        email: email,
        status: {
          in: ['pending', 'otp_sent']
        }
      },
      include: {
        sign_request: {
          include: {
            document: {
              select: {
                id: true,
                document_number: true,
                title: true,
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
      console.log('❌ Không tìm thấy yêu cầu ký nào cho email này');
      console.log('   Hoặc tất cả đã được ký xong');
      return;
    }
    
    console.log(`✅ Tìm thấy ${signers.length} yêu cầu ký:\n`);
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    signers.forEach((signer, index) => {
      const doc = signer.sign_request.document;
      const docName = doc.document_number || doc.title || doc.original_file_name;
      
      console.log(`${index + 1}. ${docName}`);
      console.log(`   Sign Request ID: ${signer.sign_request_id}`);
      console.log(`   Signer ID: ${signer.id}`);
      console.log(`   Status: ${signer.status}`);
      console.log(`   Name: ${signer.name}`);
      
      if (signer.signing_token) {
        const signingUrl = `${frontendUrl}/sign/${signer.signing_token}`;
        console.log(`   \n   📋 SIGNING URL:`);
        console.log(`   ${signingUrl}\n`);
        
        // Also show OTP if exists
        if (signer.otp && signer.otp_expire) {
          const now = new Date();
          const expireTime = new Date(signer.otp_expire);
          const isExpired = now > expireTime;
          
          console.log(`   ⚠️  OTP Status: ${isExpired ? 'EXPIRED' : 'VALID'}`);
          if (!isExpired) {
            const minutesLeft = Math.floor((expireTime - now) / 1000 / 60);
            console.log(`   ⏰ Còn ${minutesLeft} phút`);
          }
        } else {
          console.log(`   ⚠️  Chưa có OTP - Cần gửi email trước`);
        }
      } else {
        console.log(`   ⚠️  Chưa có signing token - Cần send sign request trước`);
      }
      
      console.log('');
    });
    
    // Show latest OTP if available
    const latestSigner = signers[0];
    if (latestSigner.otp) {
      console.log('\n💡 Để lấy OTP mới nhất, chạy:');
      console.log(`   node scripts/get-latest-otp.js ${latestSigner.id}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

getSigningUrl();
