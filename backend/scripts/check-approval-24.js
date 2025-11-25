const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();

p.document_approvals.findUnique({
  where: { id: 24 },
  include: { 
    approver: { select: { id: true, email: true, full_name: true } },
    workflow_step: { select: { step_name: true, approver_type: true, approver_id: true } }
  }
}).then(r => {
  console.log('📋 Approval #24:', JSON.stringify(r, null, 2));
  p.$disconnect();
});
