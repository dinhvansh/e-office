const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function generateAndGetOtp() {
  const signerId = 7; // Latest signer from newest session
  
  // Generate OTP (6 digits)
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log('🔑 Generated OTP:', otp);
  
  // Hash it
  const hashed = await bcrypt.hash(otp, 10);
  
  // Update signer
  await prisma.signers.update({
    where: { id: signerId },
    data: {
      otp: hashed,
      otp_expire: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      status: 'otp_sent',
    },
  });
  
  console.log('✅ OTP updated in database');
  console.log('📋 Use this OTP in test:', otp);
  
  await prisma.$disconnect();
}

generateAndGetOtp().catch(console.error);