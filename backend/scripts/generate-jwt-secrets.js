const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔐 Generating secure JWT secrets...\n');

const jwtSecret = crypto.randomBytes(32).toString('base64');
const refreshSecret = crypto.randomBytes(32).toString('base64');

console.log('✅ Generated secrets:');
console.log('JWT_SECRET=' + jwtSecret);
console.log('REFRESH_TOKEN_SECRET=' + refreshSecret);

console.log('\n📝 Add these to your backend/.env file:');
console.log('---');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`REFRESH_TOKEN_SECRET=${refreshSecret}`);
console.log('---');

// Try to update .env file if it exists
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  console.log('\n⚠️  Found .env file. Updating...');
  
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Update JWT_SECRET
  if (envContent.includes('JWT_SECRET=')) {
    envContent = envContent.replace(/JWT_SECRET=.*/g, `JWT_SECRET=${jwtSecret}`);
    console.log('  ✅ Updated JWT_SECRET');
  } else {
    envContent += `\nJWT_SECRET=${jwtSecret}`;
    console.log('  ✅ Added JWT_SECRET');
  }
  
  // Update REFRESH_TOKEN_SECRET
  if (envContent.includes('REFRESH_TOKEN_SECRET=')) {
    envContent = envContent.replace(/REFRESH_TOKEN_SECRET=.*/g, `REFRESH_TOKEN_SECRET=${refreshSecret}`);
    console.log('  ✅ Updated REFRESH_TOKEN_SECRET');
  } else {
    envContent += `\nREFRESH_TOKEN_SECRET=${refreshSecret}`;
    console.log('  ✅ Added REFRESH_TOKEN_SECRET');
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log('\n✅ .env file updated successfully!');
  console.log('⚠️  IMPORTANT: Restart backend server for changes to take effect');
} else {
  console.log('\n⚠️  .env file not found. Please create it from .env.example');
}
