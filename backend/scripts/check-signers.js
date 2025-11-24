const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSigners() {
  try {
    const signers = await prisma.signers.findMany({
      select: {
        id: true,
        email: true,
        signing_token: true,
        status: true,
        sign_request_id: true,
        otp: true,
        otp_expire: true,
      },
      orderBy: { id: 'desc' },
      take: 10,
    });

    console.log('📋 Recent signers:');
    signers.forEach(s => {
      console.log(`ID: ${s.id}, Email: ${s.email}`);
      console.log(`Token: ${s.signing_token?.substring(0, 30)}...`);
      console.log(`Status: ${s.status}, SignRequest: ${s.sign_request_id}`);
      console.log(`OTP: ${s.otp ? 'Set' : 'None'}, Expire: ${s.otp_expire || 'None'}`);
      console.log('---');
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSigners();