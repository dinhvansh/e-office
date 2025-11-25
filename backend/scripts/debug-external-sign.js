const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  console.log('🔍 Debugging External Sign\n');
  
  // Get external signer
  const signer = await prisma.signers.findFirst({
    where: {
      sign_request_id: 21,
      email: 'external.signer@example.com'
    }
  });
  
  console.log('External Signer:');
  console.log('  ID:', signer.id);
  console.log('  Email:', signer.email);
  console.log('  Status:', signer.status);
  console.log('  OTP:', signer.otp);
  console.log('  OTP Expire:', signer.otp_expire);
  console.log('  Token:', signer.signing_token?.substring(0, 30) + '...');
  
  // Get fields
  const fields = await prisma.sign_request_fields.findMany({
    where: {
      sign_request_id: 21,
      assigned_signer_id: signer.id
    }
  });
  
  console.log(`\nFields for this signer: ${fields.length}`);
  fields.forEach(f => {
    console.log(`  - Field ${f.id}: ${f.type} at (${f.x}, ${f.y})`);
  });
  
  await prisma.$disconnect();
}

debug().catch(console.error);
