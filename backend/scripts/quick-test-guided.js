/**
 * Quick Test: Get existing signing URL and OTP
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function quickTest() {
  try {
    console.log('🔍 Finding existing sign requests...\n');
    
    // Find a sign request with fields
    const signRequest = await prisma.sign_requests.findFirst({
      where: {
        status: {
          in: ['sent', 'in_progress', 'draft'],
        },
        fields: {
          some: {},
        },
      },
      include: {
        signers: true,
        fields: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
    
    if (!signRequest) {
      console.log('❌ No sign requests found');
      console.log('💡 Run: node scripts/test-guided-signing-flow.js to create one');
      return;
    }
    
    console.log('✅ Found sign request:', signRequest.id);
    console.log('   Status:', signRequest.status);
    console.log('   Fields:', signRequest.fields.length);
    console.log('   Signers:', signRequest.signers.length);
    
    if (signRequest.signers.length === 0) {
      console.log('\n❌ No signers found');
      return;
    }
    
    const signer = signRequest.signers[0];
    console.log('\n📧 Signer:');
    console.log('   Email:', signer.email);
    console.log('   Name:', signer.name);
    console.log('   Token:', signer.signing_token);
    
    // Generate fresh OTP
    const crypto = require('crypto');
    const bcrypt = require('bcryptjs');
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    await prisma.signers.update({
      where: { id: signer.id },
      data: {
        otp: otpHash,
        otp_expire: otpExpiry,
      },
    });
    
    console.log('\n🔑 Fresh OTP generated:', otp);
    console.log('   Expires:', otpExpiry.toLocaleString());
    
    console.log('\n🌐 Test URL:');
    console.log('   http://localhost:3000/sign/' + signer.signing_token);
    
    console.log('\n📝 Steps to test:');
    console.log('   1. Open URL in browser');
    console.log('   2. Enter email:', signer.email);
    console.log('   3. Click "Gửi mã OTP"');
    console.log('   4. Enter OTP:', otp);
    console.log('   5. Click "Bắt đầu" to start guided mode');
    console.log('   6. Sign each field');
    console.log('   7. Submit');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

quickTest();
