// Check if email config is loaded correctly
require('dotenv').config();

console.log('\n📧 EMAIL CONFIGURATION CHECK');
console.log('='.repeat(60));

const config = {
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD ? '***' + process.env.SMTP_PASSWORD.slice(-4) : undefined,
  EMAIL_FROM: process.env.EMAIL_FROM,
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
};

console.log('Current configuration:');
console.log(JSON.stringify(config, null, 2));

console.log('\n' + '='.repeat(60));

if (!config.SMTP_USER) {
  console.log('⚠️  SMTP_USER not set - emails will be logged to console');
} else {
  console.log('✅ SMTP_USER is set:', config.SMTP_USER);
}

if (!config.SMTP_PASSWORD) {
  console.log('⚠️  SMTP_PASSWORD not set');
} else {
  console.log('✅ SMTP_PASSWORD is set');
}

console.log('\n💡 If config looks wrong, restart backend server to reload .env');
