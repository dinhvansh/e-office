/**
 * Create a workflow with both approver and signer steps
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Creating Workflow with Approvers and Signers\n');
  
  // Get tenant and users
  const tenant = await prisma.tenants.findFirst();
  const users = await prisma.users.findMany({
    where: { tenant_id: tenant.id },
    take: 3
  });
  
  if (users.length < 3) {
    console.error('❌ Need at least 3 users. Please run seed scripts first.');
    return;
  }
  
  console.log(`Tenant: ${tenant.name}`);
  console.log(`Users: ${users.map(u => u.full_name).join(', ')}\n`);
  
  // Create workflow
  const workflow = await prisma.workflows.create({
    data: {
      tenant_id: tenant.id,
      name: 'Phê duyệt và ký hợp đồng',
      description: 'Workflow có cả phê duyệt và ký',
      is_template: true,
      is_active: true,
      created_by: users[0].id
    }
  });
  
  console.log(`✓ Created workflow: ${workflow.name} (ID: ${workflow.id})\n`);
  
  // Create steps
  const steps = [
    {
      workflow_id: workflow.id,
      step_order: 1,
      step_name: 'Phê duyệt trưởng phòng',
      approver_type: 'user',
      approver_id: users[0].id,
      participant_role: 'approver',
      due_in_days: 3
    },
    {
      workflow_id: workflow.id,
      step_order: 2,
      step_name: 'Phê duyệt giám đốc',
      approver_type: 'user',
      approver_id: users[1].id,
      participant_role: 'approver',
      due_in_days: 5
    },
    {
      workflow_id: workflow.id,
      step_order: 3,
      step_name: 'Ký bởi trưởng phòng',
      approver_type: 'user',
      approver_id: users[0].id,
      participant_role: 'signer',
      due_in_days: 2
    },
    {
      workflow_id: workflow.id,
      step_order: 4,
      step_name: 'Ký bởi giám đốc',
      approver_type: 'user',
      approver_id: users[1].id,
      participant_role: 'signer',
      due_in_days: 2
    }
  ];
  
  for (const step of steps) {
    await prisma.workflow_steps.create({ data: step });
    console.log(`✓ Created step ${step.step_order}: ${step.step_name} (${step.participant_role})`);
  }
  
  console.log('\n✅ Workflow created successfully!');
  console.log('\nWorkflow structure:');
  console.log('  1. Phê duyệt trưởng phòng (approver)');
  console.log('  2. Phê duyệt giám đốc (approver)');
  console.log('  3. Ký bởi trưởng phòng (signer)');
  console.log('  4. Ký bởi giám đốc (signer)');
  
  console.log('\n💡 Now you can:');
  console.log('  1. Assign this workflow to a document type');
  console.log('  2. Create a document with this workflow');
  console.log('  3. Approvers will approve first');
  console.log('  4. Then signers can sign');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
