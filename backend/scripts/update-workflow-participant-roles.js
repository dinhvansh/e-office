/**
 * Update old workflows to add participant_role field
 * This fixes the issue where old workflows don't have participant_role,
 * causing no signers to be created
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Updating Workflow Steps with participant_role\n');
  
  // Get all workflow steps without participant_role
  const stepsWithoutRole = await prisma.workflow_steps.findMany({
    where: {
      participant_role: null
    },
    include: {
      workflow: {
        select: { id: true, name: true }
      }
    }
  });
  
  console.log(`Found ${stepsWithoutRole.length} steps without participant_role\n`);
  
  if (stepsWithoutRole.length === 0) {
    console.log('✅ All workflow steps already have participant_role');
    return;
  }
  
  // Update each step
  let updated = 0;
  
  for (const step of stepsWithoutRole) {
    // Determine participant_role based on step_name or approver_type
    let participantRole = 'approver'; // Default to approver
    
    // Check if step name suggests it's a signer step
    const stepName = (step.step_name || '').toLowerCase();
    if (stepName.includes('ký') || stepName.includes('sign')) {
      participantRole = 'signer';
    }
    
    // Update the step
    await prisma.workflow_steps.update({
      where: { id: step.id },
      data: { participant_role: participantRole }
    });
    
    console.log(`✓ Updated step ${step.id}: "${step.step_name}" → ${participantRole}`);
    console.log(`  Workflow: ${step.workflow.name}`);
    updated++;
  }
  
  console.log(`\n✅ Updated ${updated} workflow steps`);
  
  // Show summary by workflow
  console.log('\n📊 Summary by Workflow:');
  
  const workflows = await prisma.workflows.findMany({
    include: {
      steps: {
        orderBy: { step_order: 'asc' }
      }
    }
  });
  
  for (const workflow of workflows) {
    const approverSteps = workflow.steps.filter(s => s.participant_role === 'approver');
    const signerSteps = workflow.steps.filter(s => s.participant_role === 'signer');
    
    console.log(`\n${workflow.name} (ID: ${workflow.id})`);
    console.log(`  Total steps: ${workflow.steps.length}`);
    console.log(`  Approver steps: ${approverSteps.length}`);
    console.log(`  Signer steps: ${signerSteps.length}`);
    
    if (workflow.steps.length > 0) {
      console.log(`  Steps:`);
      workflow.steps.forEach(step => {
        console.log(`    ${step.step_order}. ${step.step_name} - ${step.participant_role || 'N/A'}`);
      });
    }
  }
  
  console.log('\n💡 Note:');
  console.log('  - Steps with "ký" or "sign" in name are marked as "signer"');
  console.log('  - All other steps are marked as "approver"');
  console.log('  - You may need to manually adjust some steps if the auto-detection is wrong');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
