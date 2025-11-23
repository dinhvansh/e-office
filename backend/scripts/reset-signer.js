const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const signerId = process.argv[2] || 44;

prisma.signers.update({
  where: { id: parseInt(signerId) },
  data: {
    status: 'pending',
    signed_at: null,
    signature_data: null,
    signature_type: null,
  }
}).then(() => {
  console.log(`✅ Reset signer ${signerId} to pending status`);
  prisma.$disconnect();
}).catch(err => {
  console.error('❌ Error:', err.message);
  prisma.$disconnect();
});
