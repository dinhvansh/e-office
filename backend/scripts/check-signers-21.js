const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();

p.signers.findMany({
  where: {sign_request_id: 21},
  orderBy: {signing_order: 'asc'}
}).then(s => {
  console.log('Signers for Sign Request 21:\n');
  s.forEach(x => {
    console.log(`Order ${x.signing_order}: ${x.email}`);
    console.log(`  Status: ${x.status}`);
    console.log(`  Signed at: ${x.signed_at || 'Not signed'}`);
    console.log('');
  });
}).finally(() => p.$disconnect());
