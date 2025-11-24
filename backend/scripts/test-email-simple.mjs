/**
 * Simple Email Test (ES Module)
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔄 Testing email...\n');

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

try {
  console.log('🔍 Verifying connection...');
  await transporter.verify();
  console.log('✅ Connection OK!\n');

  console.log('📨 Sending test email...');
  const info = await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
    to: process.env.SMTP_USER,
    subject: 'Test Email - E-Office',
    text: 'Email test thành công!',
    html: '<h1>✅ Email test thành công!</h1><p>Hệ thống email đã hoạt động.</p>',
  });

  console.log('✅ Email sent!');
  console.log('Message ID:', info.messageId);
  console.log('\n🎉 Success! Check your inbox:', process.env.SMTP_USER);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
