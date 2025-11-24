const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWorkflowWithApprovers() {
  console.log('🔍 Checking workflows with approver info\n');

  try {
    // Get document types with workflow
    const docTypes = await prisma.document_types.findMany({
      where: {
        require_digital_signing: true,
        require_approval: true,
        default_workflow_id: { not: null }
      },
      include: {
        default_workflow: {
          include: {
            steps: {
              orderBy: { step_order: 'asc' }
            }
          }
        }
      }
    });

    console.log(`Found ${docTypes.length} document types with workflow\n`);

    for (const docType of docTypes) {
      console.log(`📄 Document Type: ${docType.name}`);
      console.log(`   Workflow: ${docType.default_workflow?.name}`);
      console.log(`   Steps: ${docType.default_workflow?.steps?.length || 0}`);
      
      if (docType.default_workflow?.steps) {
        for (const step of docType.default_workflow.steps) {
          console.log(`\n   ${step.step_order}. ${step.step_name}`);
          console.log(`      Type: ${step.approver_type}`);
          console.log(`      Approver ID: ${step.approver_id || 'NULL'}`);
          
          // Try to get approver info
          if (step.approver_type === 'user' && step.approver_id) {
            const user = await prisma.users.findUnique({
              where: { id: step.approver_id },
              select: { email: true, full_name: true }
            });
            if (user) {
              console.log(`      ✓ User: ${user.full_name || user.email} (${user.email})`);
            } else {
              console.log(`      ✗ User not found`);
            }
          } else if (step.approver_type === 'role' && step.approver_id) {
            const role = await prisma.roles.findUnique({
              where: { id: step.approver_id },
              select: { name: true }
            });
            const userRole = await prisma.user_roles.findFirst({
              where: { role_id: step.approver_id },
              include: { user: { select: { email: true, full_name: true } } }
            });
            if (role && userRole?.user) {
              console.log(`      ✓ Role: ${role.name}`);
              console.log(`      ✓ User: ${userRole.user.full_name || userRole.user.email} (${userRole.user.email})`);
            } else {
              console.log(`      ✗ Role or user not found`);
            }
          } else if (step.approver_type === 'department' && step.approver_id) {
            const dept = await prisma.departments.findUnique({
              where: { id: step.approver_id },
              include: { manager: { select: { email: true, full_name: true } } }
            });
            if (dept) {
              console.log(`      ✓ Department: ${dept.name}`);
              if (dept.manager) {
                console.log(`      ✓ Manager: ${dept.manager.full_name || dept.manager.email} (${dept.manager.email})`);
              } else {
                console.log(`      ✗ No manager assigned`);
              }
            } else {
              console.log(`      ✗ Department not found`);
            }
          } else if (step.approver_type === 'manager') {
            console.log(`      ℹ Manager type (depends on document owner)`);
          } else {
            console.log(`      ✗ No approver_id`);
          }
        }
      }
      console.log('\n' + '='.repeat(60) + '\n');
    }

    await prisma.$disconnect();
    console.log('✅ Check completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkWorkflowWithApprovers();
