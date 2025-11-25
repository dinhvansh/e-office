const {PrismaClient} = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function getOTP() {
  // Generate new OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(otp, 10);
  const otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  // Update signer with new OTP
  await prisma.signers.update({
    where: {id: 25},
    data: {
      otp: otpHash,
      otp_expire: otpExpire
    }
  });
  
  console.log('✅ Generated new OTP for signer 25');
  console.log(`   OTP: ${otp}`);
  console.log(`   Expires: ${otpExpire.toLocaleString()}`);
  
  await prisma.$disconnect();
  return otp;
}

getOTP().catch(console.error);
