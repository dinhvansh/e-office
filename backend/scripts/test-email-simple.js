require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('\n📧 Testing Email Configuration\n');
  
  console.log('Config:');
  console.log('  Host:', process.env.SMTP_HOST);
  console.log('  Port:', process.env.SMTP_PORT);
  console.log('  Secure:', process.env.SMTP_SECURE);
  console.log('  User:', process.env.SMTP_USER);
  console.log('  From:', process.env.EMAIL_FROM);
  
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });

    console.log('\n✅ Transporter created');

    // Verify connection
    console.log('\n🔌 Verifying connection...');
    await transporter.verify();
    console.log('✅ Connection verified');

    // Send test email
    console.log('\n📤 Sending test email...');
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: process.env.SMTP_USER, // Send to self
      subject: 'Test Email - E-Office System',
      html: `
        <h2>Test Email</h2>
        <p>This is a test email from E-Office system.</p>
        <p>If you receive this, email configuration is working correctly.</p>
        <p>Sent at: ${new Date().toLocaleString('vi-VN')}</p>
      `
    });

    console.log('✅ Email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    
    console.log('\n🎉 Email test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Email test failed!');
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  }
}

testEmail();
