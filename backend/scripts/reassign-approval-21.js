const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();

async function reassign() {
  // Update approval 21 to use approver user (ID 17)
  await p.document_approvals.update({
    where: {id: 21},
    data: {approver_user_id: 17}
  });
  
  console.log('✅ Reassigned approval 21 to approver@acme.local (user ID 17)');
}

reassign()
  .finally(() => p.$disconnect());
