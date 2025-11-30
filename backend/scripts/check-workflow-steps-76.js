const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWorkflowSteps() {
  console.log('🔍 Kiểm tra workflow steps cho document #76...\n');

  try {
    const document = await prisma.documents.findUnique({
      where: { id: 76 },
      include: {
        workflow_instance: {
          include: {
            workflow: {
              include: {
                steps: {
                  orderBy: { step_order: 'asc' }
                }
              }
            }
          }
        }
      }
    });

    if (!document || !document.workflow_instance) {
      console.log('❌ Không tìm thấy document hoặc workflow');
      return;
    }

    const workflow = document.workflow_instance.workflow;
    console.log('📋 WORKFLOW DETAILS');
    console.log('═══════════════════════════════════════');
    console.log(`ID: ${workflow.id}`);
    console.log(`Name: ${workflow.name}`);
    console.log(`Is Template: ${workflow.is_template}`);
    console.log(`Created For Doc: ${workflow.created_for_doc}`);
    console.log(`Based On Template: ${workflow.based_on_template}`);

    console.log('\n📌 WORKFLOW STEPS (RAW DATA)');
    console.log('═══════════════════════════════════════');

    for (const step of workflow.steps) {
      console.log(`\nStep ${step.step_order}: ${step.step_name}`);
      console.log(`  ID: ${step.id}`);
      console.log(`  Approver Type: ${step.approver_type}`);
      console.log(`  Approver ID: ${step.approver_id}`);
      console.log(`  Participant Role: ${step.participant_role}`);
      console.log(`  Is Required: ${step.is_required}`);
      console.log(`  Is Parallel: ${step.is_parallel}`);
      console.log(`  Due In Days: ${step.due_in_days}`);
      console.log(`  Conditions: ${step.conditions ? JSON.stringify(step.conditions) : 'null'}`);

      // Try to find the approver
      if (step.approver_id) {
        if (step.approver_type === 'department') {
          const dept = await prisma.departments.findUnique({
            where: { id: step.approver_id },
            include: { manager: true }
          });
          if (dept) {
            console.log(`  ✅ Department Found: ${dept.name}`);
            console.log(`     Manager: ${dept.manager?.full_name || 'No manager'}`);
          } else {
            console.log(`  ❌ Department ID ${step.approver_id} NOT FOUND`);
          }
        } else if (step.approver_type === 'role') {
          const role = await prisma.roles.findUnique({
            where: { id: step.approver_id },
            include: {
              user_roles: {
                include: { user: true }
              }
            }
          });
          if (role) {
            console.log(`  ✅ Role Found: ${role.name}`);
            console.log(`     Users with this role: ${role.user_roles.length}`);
            role.user_roles.forEach(ur => {
              console.log(`       - ${ur.user.full_name} (${ur.user.email})`);
            });
          } else {
            console.log(`  ❌ Role ID ${step.approver_id} NOT FOUND`);
          }
        } else if (step.approver_type === 'user') {
          const user = await prisma.users.findUnique({
            where: { id: step.approver_id }
          });
          if (user) {
            console.log(`  ✅ User Found: ${user.full_name} (${user.email})`);
          } else {
            console.log(`  ❌ User ID ${step.approver_id} NOT FOUND`);
          }
        }
      } else {
        console.log(`  ⚠️ approver_id is NULL`);
      }
    }

    // Check if template workflow exists
    if (workflow.based_on_template) {
      console.log('\n📄 TEMPLATE WORKFLOW');
      console.log('═══════════════════════════════════════');
      const template = await prisma.workflows.findUnique({
        where: { id: workflow.based_on_template },
        include: {
          steps: {
            orderBy: { step_order: 'asc' }
          }
        }
      });

      if (template) {
        console.log(`Template Name: ${template.name}`);
        console.log(`\nTemplate Steps:`);
        template.steps.forEach(step => {
          console.log(`  ${step.step_order}. ${step.step_name}`);
          console.log(`     Type: ${step.approver_type}, ID: ${step.approver_id}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWorkflowSteps();
