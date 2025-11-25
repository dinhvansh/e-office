const axios = require('axios');

const API_BASE = 'http://localhost:4000/api/v1';
const SIGN_REQUEST_ID = 47; // Change this if needed

async function resendSignRequest() {
  console.log('\n📧 RESEND SIGN REQUEST');
  console.log('='.repeat(60));
  console.log(`📝 Sign Request ID: ${SIGN_REQUEST_ID}`);
  
  try {
    // Step 1: Admin login
    console.log('\n📝 STEP 1: Admin Login');
    const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@acme.local',
      password: 'password123'
    });
    const adminToken = adminLogin.data.data.tokens.accessToken;
    console.log('✅ Admin logged in');

    // Step 2: Send sign request
    console.log('\n📝 STEP 2: Send Sign Request');
    const response = await axios.post(
      `${API_BASE}/sign-requests/${SIGN_REQUEST_ID}/send`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    console.log('✅ Sign request sent successfully!');
    console.log('\n📧 Email sent with:');
    console.log('   - Signing URL');
    console.log('   - OTP code (6 digits)');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ RESEND COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n💡 Check your email for:');
    console.log('   ✉️  Signing URL (clickable button)');
    console.log('   🔑 OTP code (6 digits)');
    console.log('\n🔗 Or use the same URL:');
    console.log('   http://localhost:3000/sign/[token]');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

resendSignRequest();
