const axios = require('axios');

async function getLatestOTP() {
  console.log('🔍 Đang lấy OTP mới nhất...\n');
  
  try {
    // Login as admin
    const loginResponse = await axios.post('http://localhost:4000/api/v1/auth/login', {
      email: 'admin@acme.local',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.access_token;
    console.log('✅ Đăng nhập admin thành công');
    
    // Get all signers directly from database
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const signers = await prisma.signers.findMany({
      where: {
        otp: { not: null },
        otp_expire: { not: null }
      },
      orderBy: { id: 'desc' },
      take: 10
    });
    
    // signers already fetched above
    console.log(`📋 Tìm thấy ${signers.length} signers`);
    
    // Find signers with OTP
    const signersWithOTP = signers.filter(s => s.otp && s.otp_expire);
    
    if (signersWithOTP.length === 0) {
      console.log('❌ Không tìm thấy OTP nào');
      console.log('\n💡 Hướng dẫn:');
      console.log('1. Mở UI: http://localhost:3000/sign/9114c5195c78b54483efa858801968e9190a95bf9f2b485a982b5b50d106698c');
      console.log('2. Nhập email: test.signer@example.com');
      console.log('3. Click "Gửi mã OTP"');
      console.log('4. Chạy lại script này');
      return;
    }
    
    console.log('\n🎉 DANH SÁCH OTP:');
    console.log('=' .repeat(60));
    
    signersWithOTP.forEach((signer, index) => {
      const isExpired = new Date(signer.otp_expire) < new Date();
      const timeLeft = Math.max(0, Math.floor((new Date(signer.otp_expire) - new Date()) / 1000));
      
      console.log(`${index + 1}. 📧 Email: ${signer.email}`);
      console.log(`   🔑 OTP: ${signer.otp}`);
      console.log(`   ⏰ Hết hạn: ${new Date(signer.otp_expire).toLocaleString('vi-VN')}`);
      console.log(`   ⏳ Còn lại: ${isExpired ? '❌ ĐÃ HẾT HẠN' : `${timeLeft}s`}`);
      console.log(`   🔗 Token: ${signer.signing_token?.substring(0, 20)}...`);
      console.log('');
    });
    
    console.log('=' .repeat(60));
    
    // Show the latest valid OTP
    const validOTPs = signersWithOTP.filter(s => new Date(s.otp_expire) > new Date());
    if (validOTPs.length > 0) {
      const latest = validOTPs[validOTPs.length - 1];
      console.log('\n✅ OTP MỚI NHẤT (DÙNG NGAY):');
      console.log(`🔑 ${latest.otp}`);
      console.log(`📧 ${latest.email}`);
      
      // Generate signing URL
      const signingURL = `http://localhost:3000/sign/${latest.signing_token}`;
      console.log(`🔗 ${signingURL}`);
    }
    
  } catch (error) {
    console.error('❌ Lỗi:', error.response?.data || error.message);
  }
}

getLatestOTP();