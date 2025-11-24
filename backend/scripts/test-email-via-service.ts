/**
 * Test Email via App Service
 */

import { emailService } from '../src/modules/common/email.service';

async function testEmail() {
  console.log('🔄 Testing email via EmailService...\n');
  const testEmail = process.env.SMTP_USER || 'testsmtp@locautienphuoc.com';

  try {
    console.log('📨 Sending test OTP email to:', testEmail);
    
    await emailService.sendOtpEmail({
      recipientEmail: testEmail,
      recipientName: 'Test User',
      otp: '123456',
      expiryMinutes: 5,
    });

    console.log('✅ Email sent successfully!');
    console.log('🎉 Check your inbox:', testEmail);
    console.log('');
  } catch (error: any) {
    console.error('❌ Failed to send email:', error.message);
    throw error;
  }
}

testEmail()
  .then(() => {
    console.log('✅ Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
