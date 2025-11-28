const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

// Test credentials
const ADMIN_EMAIL = 'admin@acme.local';
const ADMIN_PASSWORD = 'Admin@123';

let authToken = '';

async function login() {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    authToken = response.data.data.token;
    console.log('✅ Logged in successfully');
    return response.data.data;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function getSignRequests() {
  try {
    const response = await axios.get(`${API_URL}/sign-requests/my`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    return response.data.data.sign_requests;
  } catch (error) {
    console.error('❌ Failed to get sign requests:', error.response?.data || error.message);
    throw error;
  }
}

async function sendSignRequest(signRequestId) {
  try {
    const response = await axios.post(
      `${API_URL}/sign-requests/${signRequestId}/send`,
      {},
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    console.log(`✅ Sign request ${signRequestId} sent successfully`);
    return response.data.data.sign_request;
  } catch (error) {
    console.error(`❌ Failed to send sign request ${signRequestId}:`, error.response?.data || error.message);
    throw error;
  }
}

async function testResendLogic() {
  console.log('\n🧪 Testing Resend Logic\n');
  console.log('='.repeat(60));

  // Login
  await login();

  // Get all sign requests
  console.log('\n📋 Fetching sign requests...');
  const signRequests = await getSignRequests();
  
  console.log(`\nFound ${signRequests.length} sign requests:`);
  signRequests.forEach(sr => {
    console.log(`  - ID: ${sr.id}, Status: ${sr.status}, Title: ${sr.title || sr.document?.title}`);
  });

  // Find a sign request with status 'pending' or 'sent'
  const sentRequest = signRequests.find(sr => 
    sr.status === 'pending' || sr.status === 'sent' || sr.status === 'in_progress'
  );

  if (!sentRequest) {
    console.log('\n⚠️  No sent/pending sign requests found to test resend');
    console.log('💡 Create a sign request and send it first, then run this test');
    return;
  }

  console.log(`\n🎯 Testing resend for Sign Request ID: ${sentRequest.id}`);
  console.log(`   Current Status: ${sentRequest.status}`);

  // Try to resend
  console.log('\n📧 Attempting to resend...');
  try {
    const result = await sendSignRequest(sentRequest.id);
    console.log('\n✅ RESEND SUCCESSFUL!');
    console.log(`   New Status: ${result.status}`);
    console.log('\n✨ Resend logic is working correctly!');
  } catch (error) {
    console.log('\n❌ RESEND FAILED!');
    console.log('   Error:', error.response?.data?.error || error.message);
    console.log('\n🔍 This indicates the resend logic needs to be fixed');
  }

  // Test that completed/cancelled cannot be resent
  const completedRequest = signRequests.find(sr => 
    sr.status === 'completed' || sr.status === 'cancelled'
  );

  if (completedRequest) {
    console.log(`\n🧪 Testing that completed/cancelled cannot be resent...`);
    console.log(`   Sign Request ID: ${completedRequest.id}, Status: ${completedRequest.status}`);
    
    try {
      await sendSignRequest(completedRequest.id);
      console.log('❌ ERROR: Should not allow resending completed/cancelled requests!');
    } catch (error) {
      console.log('✅ Correctly blocked resending completed/cancelled request');
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test completed\n');
}

// Run test
testResendLogic().catch(error => {
  console.error('\n💥 Test failed:', error.message);
  process.exit(1);
});
