/**
 * Test email sending in production mode
 * Tests all email templates and SMTP configuration
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
  // Create transporter
  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
  console.log('🧪 Testing Email Configuration...\n');

  const testEmail = 'dinhvansh020895@gmail.com'; // Change to your test email

  try {
    // Test 1: Simple test email
    console.log('1️⃣ Sending test email...');
    await transporter.sendMail({
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
      to: testEmail,
      subject: 'E-Office - Test Email',
      html: `
        <h1>✅ Email Configuration Working!</h1>
        <p>This is a test email from E-Office system.</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Environment:</strong> ${process.env.NODE_ENV}</p>
      `
    });
    console.log('✅ Test email sent successfully!\n');

    // Test 2: Registration confirmation
    console.log('2️⃣ Testing registration email template...');
    await transporter.sendMail({
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
      to: testEmail,
      subject: 'Đăng ký thành công - E-Office',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Đăng ký thành công!</h1>
            </div>
            <div class="content">
              <p>Xin chào <strong>Test User</strong>,</p>
              <p>Tài khoản của bạn đã được tạo thành công!</p>
              <p>Đây là email test từ hệ thống E-Office.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });
    console.log('✅ Registration email sent!\n');

    // Test 3: OTP email
    console.log('3️⃣ Testing OTP email template...');
    const testOTP = Math.floor(100000 + Math.random() * 900000).toString();
    await transporter.sendMail({
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
      to: testEmail,
      subject: 'Mã OTP ký tài liệu - E-Office',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .otp-box { background: #f0f9ff; border: 2px solid #3b82f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
            .otp-code { font-size: 32px; font-weight: bold; color: #1e40af; letter-spacing: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>🔐 Mã OTP của bạn</h2>
            <p>Sử dụng mã OTP sau để ký tài liệu:</p>
            <div class="otp-box">
              <div class="otp-code">${testOTP}</div>
            </div>
            <p><strong>⏰ Mã có hiệu lực trong 10 phút</strong></p>
            <p>Đây là email test từ hệ thống E-Office.</p>
          </div>
        </body>
        </html>
      `
    });
    console.log('✅ OTP email sent!\n');

    console.log('🎉 All email tests passed!');
    console.log(`📧 Check your inbox: ${testEmail}`);

  } catch (error) {
    console.error('❌ Email test failed:');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('SMTP Response:', error.response);
    }
    process.exit(1);
  }
}

// Run test
testEmail();
