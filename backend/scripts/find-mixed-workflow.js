const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const workflows = await prisma.workflows.findMany({
    include: { steps: true }
  });
  
  console.log('🔍 Finding workflows with both approvers and signers:\n');
  
  for (const w of workflows) {
    const approvers = w.steps.filter(s => s.participant_role === 'approver' || !s.participant_role);
    const signers = w.steps.filter(s => s.participant_role === 'signer');
    
    if (approvers.length > 0 && signers.length > 0) {
      console.log(`✅ Workflow: ${w.name} (ID: ${w.id})`);
      console.log(`   Approvers: ${approvers.length}, Signers: ${signers.length}`);
      console.log(`   Steps:`);
      for (const step of w.steps) {
        const role = step.participant_role || 'approver (default)';
        console.log(`     ${step.step_order}. ${step.step_name} - ${role}`);
      }
      console.log();
    }
  }
  
  await prisma.$disconnect();
}

main();
