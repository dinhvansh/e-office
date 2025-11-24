/**
 * Test SMTP with different configurations
 */

const nodemailer = require('nodemailer');

const configs = [
  {
    name: 'Gmail (TLS)',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'your-email@gmail.com', // Replace with your Gmail
      pass: 'your-app-password', // Replace with Gmail App Password
    },
  },
  {
    name: 'Gmail (SSL)',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: 'your-email@gmail.com',
      pass: 'your-app-password',
    },
  },
  {
    name: 'Outlook (TLS)',
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    auth: {
      user: 'your-email@outlook.com',
      pass: 'your-password',
    },
  },
  {
    name: 'Mailtrap (Testing)',
    host: 'smtp.mailtrap.io',
    port: 2525,
    secure: false,
    auth: {
      user: 'your-mailtrap-user',
      pass: 'your-mailtrap-pass',
    },
  },
  {
    name: 'locautienphuoc.com (Port 587)',
    host: 'mail9066.maychuemail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'teststmp@locautienphuoc.com',
      pass: 'tceSYUum8J',
    },
  },
  {
    name: 'locautienphuoc.com (Port 465)',
    host: 'mail9066.maychuemail.com',
    port: 465,
    secure: true,
    auth: {
      user: 'teststmp@locautienphuoc.com',
      pass: 'tceSYUum8J',
    },
  },
];

async function testConfig(config) {
  console.log(`\n🧪 Testing: ${config.name}`);
  console.log(`   Host: ${config.host}:${config.port}`);
  console.log(`   Secure: ${config.secure}`);
  console.log(`   User: ${config.auth.user}`);

  try {
    const transporter = nodemailer.createTransport(config);

    // Verify connection
    console.log('   ⏳ Verifying connection...');
    await transporter.verify();
    console.log('   ✅ Connection successful!');

    // Try sending test email
    console.log('   ⏳ Sending test email...');
    const info = await transporter.sendMail({
      from: `"WP Sign Test" <${config.auth.user}>`,
      to: config.auth.user, // Send to self
      subject: 'SMTP Test - ' + new Date().toISOString(),
      text: 'This is a test email from WP Sign SMTP configuration test.',
      html: '<p>This is a <strong>test email</strong> from WP Sign SMTP configuration test.</p>',
    });

    console.log('   ✅ Email sent successfully!');
    console.log('   📧 Message ID:', info.messageId);
    return true;
  } catch (error) {
    console.log('   ❌ Failed:', error.message);
    if (error.code) {
      console.log('   📋 Error code:', error.code);
    }
    if (error.response) {
      console.log('   📋 Server response:', error.response);
    }
    return false;
  }
}

async function testAll() {
  console.log('🔍 Testing SMTP Configurations\n');
  console.log('=' .repeat(60));

  const results = [];

  for (const config of configs) {
    const success = await testConfig(config);
    results.push({ name: config.name, success });
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Summary:\n');

  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
  });

  const successCount = results.filter(r => r.success).length;
  console.log(`\n✅ ${successCount}/${results.length} configurations working`);

  if (successCount === 0) {
    console.log('\n💡 Suggestions:');
    console.log('   1. For Gmail: Use App Password (not regular password)');
    console.log('      Generate at: https://myaccount.google.com/apppasswords');
    console.log('   2. For Outlook: Enable "Less secure app access"');
    console.log('   3. For custom domain: Check with hosting provider');
    console.log('   4. Use Mailtrap for testing: https://mailtrap.io');
    console.log('   5. Consider using SendGrid, AWS SES, or Mailgun for production');
  }
}

// Run tests
testAll().catch(console.error);
