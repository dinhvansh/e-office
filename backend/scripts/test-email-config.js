/**
 * Test Email Configuration
 * Tests SMTP connection and sends a test email
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmailConfig() {
  console.log('🔄 Testing email configuration...\n');

  // Display current config
  console.log('📧 Email Configuration:');
  console.log('─'.repeat(50));
  console.log(`   Host: ${process.env.SMTP_HOST}`);
  console.log(`   Port: ${process.env.SMTP_PORT}`);
  console.log(`   Secure (SSL): ${process.env.SMTP_SECURE}`);
  console.log(`   User: ${process.env.SMTP_USER}`);
  console.log(`   From: ${process.env.EMAIL_FROM}`);
  console.log(`   From Name: ${process.env.EMAIL_FROM_NAME}`);
  console.log('─'.repeat(50));
  console.log('');

  // Check if credentials are set
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.log('⚠️  SMTP credentials not set!');
    console.log('   Please update backend/.env with:');
    console.log('   - SMTP_USER=admin@locautienphuoc.com');
    console.log('   - SMTP_PASSWORD=your-actual-password\n');
    return;
  }

  if (process.env.SMTP_PASSWORD === 'your-password-here') {
    console.log('⚠️  Please update SMTP_PASSWORD in backend/.env\n');
    return;
  }

  try {
    // Create transporter
    console.log('🔌 Creating SMTP transporter...');
    const createTransporter = nodemailer.default || nodemailer;
    const transporter = createTransporter.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false, // For self-signed certificates
      },
    });

    // Verify connection
    console.log('🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified!\n');

    // Send test email
    console.log('📨 Sending test email...');
    const testEmail = process.env.SMTP_USER; // Send to self
    
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: testEmail,
      subject: 'Test Email - E-Office System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .success { color: #10b981; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Email Test Successful!</h1>
              <p>E-Office System - Email Configuration</p>
            </div>
            <div class="content">
              <p>Xin chào,</p>
              <p>Đây là email test từ hệ thống E-Office. Nếu bạn nhận được email này, nghĩa là cấu hình email đã hoạt động <span class="success">thành công</span>!</p>
              
              <div class="info-box">
                <h3>📧 Thông tin cấu hình:</h3>
                <ul>
                  <li><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}</li>
                  <li><strong>SMTP Port:</strong> ${process.env.SMTP_PORT}</li>
                  <li><strong>SSL/TLS:</strong> ${process.env.SMTP_SECURE === 'true' ? 'Enabled' : 'Disabled'}</li>
                  <li><strong>From Email:</strong> ${process.env.EMAIL_FROM}</li>
                  <li><strong>From Name:</strong> ${process.env.EMAIL_FROM_NAME}</li>
                </ul>
              </div>

              <div class="info-box">
                <h3>🎯 Các loại email hệ thống sẽ gửi:</h3>
                <ul>
                  <li>✉️ OTP verification codes</li>
                  <li>📝 Sign request notifications</li>
                  <li>✅ Approval notifications</li>
                  <li>🔔 Workflow status updates</li>
                  <li>📄 Document sharing notifications</li>
                </ul>
              </div>

              <p><strong>Thời gian test:</strong> ${new Date().toLocaleString('vi-VN')}</p>
              
              <div class="footer">
                <p>E-Office System - Document Management & E-Signature</p>
                <p>Powered by WP Sign</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log('✅ Test email sent successfully!\n');
    console.log('📬 Email Details:');
    console.log('─'.repeat(50));
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   To: ${testEmail}`);
    console.log(`   Response: ${info.response}`);
    console.log('─'.repeat(50));
    console.log('');
    console.log('🎉 Email configuration is working correctly!');
    console.log('   Check your inbox at:', testEmail);
    console.log('');

  } catch (error) {
    console.error('❌ Email test failed!\n');
    console.error('Error details:');
    console.error('─'.repeat(50));
    console.error(error.message);
    console.error('─'.repeat(50));
    console.error('');
    
    console.log('💡 Troubleshooting tips:');
    console.log('   1. Check SMTP credentials are correct');
    console.log('   2. Verify SMTP_HOST and SMTP_PORT');
    console.log('   3. Check if firewall blocks port 465');
    console.log('   4. Try alternative port 587 with STARTTLS');
    console.log('   5. Check email account has SMTP enabled');
    console.log('');
    
    throw error;
  }
}

// Run test
testEmailConfig()
  .then(() => {
    console.log('✅ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
  });
