const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();

p.document_approvals.findUnique({
  where: {id: 21},
  include: {approver: true}
}).then(a => {
  console.log('Approval 21:');
  console.log('  Approver:', a.approver.email);
  console.log('  User ID:', a.approver_user_id);
  console.log('  Action:', a.action);
  
  // Check approver user
  return p.users.findUnique({
    where: {email: 'approver@acme.local'}
  });
}).then(u => {
  console.log('\nApprover User:');
  console.log('  ID:', u.id);
  console.log('  Email:', u.email);
}).finally(() => p.$disconnect());
