/**
 * Check workflow steps data - debug approver info
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWorkflowSteps() {
  console.log('🔍 Checking Workflow Steps Data\n');

  try {
    // Find HOPDONG workflow
    const workflow = await prisma.workflows.findFirst({
      where: { name: 'HOPDONG' },
      include: {
        steps: {
          orderBy: { step_order: 'asc' }
        }
      }
    });

    if (!workflow) {
      console.log('❌ HOPDONG workflow not found');
      return;
    }

    console.log('✅ Workflow:', workflow.name);
    console.log('   ID:', workflow.id);
    console.log('   Steps:', workflow.steps.length);
    console.log('');

    // Check each step
    for (const step of workflow.steps) {
      console.log(`📋 Step ${step.step_order}: ${step.step_name}`);
      console.log('   ID:', step.id);
      console.log('   Approver Type:', step.approver_type);
      console.log('   Approver ID:', step.approver_id);

      // Try to get approver info based on type
      if (step.approver_type === 'user' && step.approver_id) {
        const user = await prisma.users.findUnique({
          where: { id: step.approver_id },
          select: { id: true, email: true, full_name: true }
        });
        console.log('   ✅ User:', user?.full_name || user?.email || 'NOT FOUND');
        console.log('   ✅ Email:', user?.email || 'NOT FOUND');
      } else if (step.approver_type === 'role' && step.approver_id) {
        const role = await prisma.roles.findUnique({
          where: { id: step.approver_id },
          select: { id: true, name: true }
        });
        console.log('   ✅ Role:', role?.name || 'NOT FOUND');
        
        // Get first user with this role
        const userRole = await prisma.user_roles.findFirst({
          where: { role_id: step.approver_id },
          include: { user: { select: { email: true, full_name: true } } }
        });
        if (userRole?.user) {
          console.log('   ✅ Example User:', userRole.user.full_name || userRole.user.email);
          console.log('   ✅ Email:', userRole.user.email);
        }
      } else if (step.approver_type === 'department' && step.approver_id) {
        const dept = await prisma.departments.findUnique({
          where: { id: step.approver_id },
          include: { manager: { select: { email: true, full_name: true } } }
        });
        console.log('   ✅ Department:', dept?.name || 'NOT FOUND');
        if (dept?.manager) {
          console.log('   ✅ Manager:', dept.manager.full_name || dept.manager.email);
          console.log('   ✅ Email:', dept.manager.email);
        }
      } else if (step.approver_type === 'manager') {
        console.log('   ✅ Approver: Quản lý trực tiếp (tùy người tạo)');
      } else {
        console.log('   ❌ No approver_id or unknown type');
      }
      console.log('');
    }

    // Test the service method
    console.log('🧪 Testing WorkflowsService.getWorkflow()...\n');
    const { workflowsService } = require('../src/modules/workflows/workflows.service');
    
    const enrichedWorkflow = await workflowsService.getWorkflow(workflow.id, workflow.tenant_id);
    
    console.log('✅ Enriched Workflow:', enrichedWorkflow.name);
    console.log('   Steps with approver info:');
    enrichedWorkflow.steps.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step.step_name}`);
      console.log(`      Approver Name: ${step.approver_name || 'MISSING'}`);
      console.log(`      Approver Email: ${step.approver_email || 'MISSING'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkWorkflowSteps();
