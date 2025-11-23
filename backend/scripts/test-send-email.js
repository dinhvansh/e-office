/**
 * Test Script: Send Email
 * 
 * Test gửi email thật với SMTP config
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

async function testSendEmail() {
  console.log('\n📧 Testing Email Send...\n');
  
  // SMTP Config
  const config = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '25'),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === 'yes',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  };
  
  console.log('📋 SMTP Configuration:');
  console.log('════════════════════════════════════════════════════════════');
  console.log('Host:', config.host);
  console.log('Port:', config.port);
  console.log('Secure:', config.secure);
  console.log('User:', config.auth.user);
  console.log('Password:', '***' + config.auth.pass.slice(-4));
  console.log('════════════════════════════════════════════════════════════\n');
  
  try {
    // Create transporter
    console.log('🔧 Creating transporter...');
    const transporter = nodemailer.createTransport(config);
    
    // Verify connection
    console.log('🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified!\n');
    
    // Send test email
    console.log('📤 Sending test email...');
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: 'vanqn95@gmail.com',
      subject: '🧪 Test Email - WP Sign System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Email Test Successful!</h1>
              <p>WP Sign - E-Signature System</p>
            </div>
            <div class="content">
              <div class="success">
                <strong>✅ Chúc mừng!</strong> Email system đã hoạt động bình thường.
              </div>
              
              <h2>📋 Thông tin test:</h2>
              <ul>
                <li><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</li>
                <li><strong>SMTP Host:</strong> ${config.host}</li>
                <li><strong>SMTP Port:</strong> ${config.port}</li>
                <li><strong>From:</strong> ${process.env.EMAIL_FROM}</li>
                <li><strong>To:</strong> vanqn95@gmail.com</li>
              </ul>
              
              <h2>🚀 Tính năng đã test:</h2>
              <ul>
                <li>✅ SMTP connection</li>
                <li>✅ Email authentication</li>
                <li>✅ HTML email template</li>
                <li>✅ Vietnamese characters (UTF-8)</li>
              </ul>
              
              <h2>📝 Next steps:</h2>
              <ol>
                <li>Test OTP email</li>
                <li>Test sign request notification</li>
                <li>Test sign completed notification</li>
              </ol>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="http://localhost:3000" class="button">
                  🔗 Mở WP Sign System
                </a>
              </div>
            </div>
            <div class="footer">
              <p>© 2025 WP Sign - E-Signature System</p>
              <p>Email này được gửi tự động từ hệ thống test</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
    
    console.log('✅ Email sent successfully!\n');
    console.log('📬 Email Info:');
    console.log('════════════════════════════════════════════════════════════');
    console.log('Message ID:', info.messageId);
    console.log('From:', process.env.EMAIL_FROM);
    console.log('To:', 'vanqn95@gmail.com');
    console.log('Subject:', '🧪 Test Email - WP Sign System');
    console.log('════════════════════════════════════════════════════════════\n');
    
    console.log('💡 Check your email at: vanqn95@gmail.com\n');
    
  } catch (error) {
    console.error('\n❌ Email send failed:', error.message);
    console.error('\n🔍 Error details:', error);
    process.exit(1);
  }
}

testSendEmail();
