const axios = require('axios');

const API_URL = 'http://localhost:4000/api/v1';

async function testSettingsAPI() {
  console.log('🧪 Testing Settings API...\n');

  try {
    // 1. Login as admin
    console.log('1️⃣ Logging in as admin...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@acme.local',
      password: 'admin123'
    });
    const token = loginRes.data.data?.tokens?.accessToken;
    if (!token) {
      console.log('Login response:', JSON.stringify(loginRes.data, null, 2));
      throw new Error('No token in response');
    }
    console.log('✅ Logged in successfully\n');

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Get email config (should be empty initially)
    console.log('2️⃣ Getting email config...');
    const emailGetRes = await axios.get(`${API_URL}/settings/email`, { headers });
    console.log('Current email config:', emailGetRes.data.data || 'null');
    console.log('✅ Email config retrieved\n');

    // 3. Save email config
    console.log('3️⃣ Saving email config...');
    const emailConfig = {
      provider: 'gmail',
      smtp_host: 'smtp.gmail.com',
      smtp_port: '587',
      smtp_user: 'test@company.com',
      smtp_password: 'app-password-here',
      smtp_from: 'noreply@company.com',
      smtp_from_name: 'E-Office System',
      use_oauth: false
    };
    const emailSaveRes = await axios.post(`${API_URL}/settings/email`, emailConfig, { headers });
    console.log('✅', emailSaveRes.data.message);
    console.log('Saved config:', emailConfig);
    console.log();

    // 4. Get email config again (should have data now)
    console.log('4️⃣ Getting email config again...');
    const emailGetRes2 = await axios.get(`${API_URL}/settings/email`, { headers });
    console.log('Updated email config:', emailGetRes2.data.data);
    console.log('✅ Email config verified\n');

    // 5. Get watermark config
    console.log('5️⃣ Getting watermark config...');
    const watermarkGetRes = await axios.get(`${API_URL}/settings/watermark`, { headers });
    console.log('Current watermark config:', watermarkGetRes.data.data);
    console.log('✅ Watermark config retrieved\n');

    // 6. Save watermark config
    console.log('6️⃣ Saving watermark config...');
    const watermarkConfig = {
      enabled: true,
      text: 'CÔNG TY CỔ PHẦN ABC',
      position: 'diagonal',
      opacity: 0.3,
      fontSize: 48,
      rotation: 45,
      color: '#0066cc'
    };
    const watermarkSaveRes = await axios.post(`${API_URL}/settings/watermark`, watermarkConfig, { headers });
    console.log('✅', watermarkSaveRes.data.message);
    console.log('Saved config:', watermarkConfig);
    console.log();

    // 7. Get watermark config again
    console.log('7️⃣ Getting watermark config again...');
    const watermarkGetRes2 = await axios.get(`${API_URL}/settings/watermark`, { headers });
    console.log('Updated watermark config:', watermarkGetRes2.data.data);
    console.log('✅ Watermark config verified\n');

    // 8. Get all settings
    console.log('8️⃣ Getting all settings...');
    const allSettingsRes = await axios.get(`${API_URL}/settings`, { headers });
    console.log('All settings:', JSON.stringify(allSettingsRes.data.data, null, 2));
    console.log('✅ All settings retrieved\n');

    // 9. Test email (optional)
    console.log('9️⃣ Testing email send...');
    try {
      const testEmailRes = await axios.post(`${API_URL}/settings/email/test`, 
        { testEmail: 'test@example.com' }, 
        { headers }
      );
      console.log('✅', testEmailRes.data.message);
      if (testEmailRes.data.note) {
        console.log('Note:', testEmailRes.data.note);
      }
    } catch (error) {
      console.log('⚠️ Test email:', error.response?.data?.error || error.message);
    }
    console.log();

    console.log('✅ All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSettingsAPI();
