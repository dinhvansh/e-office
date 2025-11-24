const { spawn } = require('child_process');
const axios = require('axios');

let currentOTP = null;
let currentEmail = null;

console.log('🎧 Đang lắng nghe backend để lấy OTP...\n');
console.log('📋 Hướng dẫn sử dụng:');
console.log('1. Mở browser: http://localhost:3000/sign/9114c5195c78b54483efa858801968e9190a95bf9f2b485a982b5b50d106698c');
console.log('2. Nhập email: test.signer@example.com');
console.log('3. Click "Gửi mã OTP"');
console.log('4. Script này sẽ tự động hiển thị OTP\n');
console.log('🔍 Đang theo dõi backend logs...\n');

// Function to get current OTP from database
async function getCurrentOTP(email) {
  try {
    const response = await axios.post('http://localhost:4000/api/v1/auth/login', {
      email: 'admin@acme.local',
      password: 'password123'
    });
    
    const token = response.data.data.access_token;
    
    // Get signer by email
    const signersResponse = await axios.get('http://localhost:4000/api/v1/signers', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const signer = signersResponse.data.data.find(s => s.email === email);
    if (signer && signer.otp) {
      return { otp: signer.otp, expire: signer.otp_expire };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Function to check for OTP in database periodically
async function checkForOTP() {
  if (currentEmail) {
    const otpData = await getCurrentOTP(currentEmail);
    if (otpData && otpData.otp !== currentOTP) {
      currentOTP = otpData.otp;
      console.log('\n🎉 ĐÃ TÌM THẤY OTP MỚI!');
      console.log('=' .repeat(50));
      console.log(`📧 Email: ${currentEmail}`);
      console.log(`🔑 OTP: ${currentOTP}`);
      console.log(`⏰ Hết hạn: ${new Date(otpData.expire).toLocaleString('vi-VN')}`);
      console.log('=' .repeat(50));
      console.log('\n✅ Bây giờ bạn có thể nhập OTP này vào UI!');
      console.log('🔄 Tiếp tục lắng nghe OTP mới...\n');
    }
  }
}

// Check every 2 seconds
setInterval(checkForOTP, 2000);

// Also listen to backend process output if available
try {
  const backendProcess = spawn('npm', ['run', 'dev'], { 
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe']
  });

  backendProcess.stdout.on('data', (data) => {
    const output = data.toString();
    
    // Look for OTP patterns in logs
    const otpMatch = output.match(/OTP.*?(\d{6})/i);
    if (otpMatch) {
      const otp = otpMatch[1];
      if (otp !== currentOTP) {
        currentOTP = otp;
        console.log('\n🎉 PHÁT HIỆN OTP TRONG LOGS!');
        console.log('=' .repeat(50));
        console.log(`🔑 OTP: ${otp}`);
        console.log('=' .repeat(50));
        console.log('\n✅ Sử dụng OTP này trong UI!');
      }
    }
    
    // Look for email patterns
    const emailMatch = output.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch && emailMatch[1].includes('test.signer')) {
      currentEmail = emailMatch[1];
      console.log(`📧 Phát hiện email: ${currentEmail}`);
    }
  });

  backendProcess.stderr.on('data', (data) => {
    // Silent - don't show backend errors
  });

} catch (error) {
  console.log('⚠️  Không thể kết nối trực tiếp với backend process');
  console.log('🔄 Sử dụng polling database thay thế...');
}

// Set default email for testing
currentEmail = 'test.signer@example.com';

console.log('🚀 Script đã sẵn sàng! Hãy thử gửi OTP từ UI...');