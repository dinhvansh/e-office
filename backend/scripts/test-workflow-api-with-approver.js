/**
 * Test Workflow API - Verify approver info is returned
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testWorkflowAPI() {
  console.log('🧪 Testing Workflow API with Approver Info\n');

  try {
    // 1. Get HOPDONG workflow
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

    // 2. Enrich steps with approver info (same logic as service)
    const enrichedSteps = await Promise.all(
      workflow.steps.map(async (step) => {
        let approverName = '';
        let approverEmail = '';
        
        if (step.approver_type === 'user' && step.approver_id) {
          const user = await prisma.users.findUnique({
            where: { id: step.approver_id },
            select: { email: true, full_name: true }
          });
          if (user) {
            approverEmail = user.email;
            approverName = user.full_name || user.email;
          }
        } else if (step.approver_type === 'role' && step.approver_id) {
          const role = await prisma.roles.findUnique({
            where: { id: step.approver_id },
            select: { name: true }
          });
          if (role) {
            approverName = `Vai trò: ${role.name}`;
            const userRole = await prisma.user_roles.findFirst({
              where: { role_id: step.approver_id },
              include: { user: { select: { email: true, full_name: true } } }
            });
            if (userRole?.user) {
              approverEmail = userRole.user.email;
              approverName = userRole.user.full_name || userRole.user.email;
            }
          }
        } else if (step.approver_type === 'department' && step.approver_id) {
          const dept = await prisma.departments.findUnique({
            where: { id: step.approver_id },
            include: { manager: { select: { email: true, full_name: true } } }
          });
          if (dept) {
            approverName = `Phòng ban: ${dept.name}`;
            if (dept.manager) {
              approverEmail = dept.manager.email;
              approverName = dept.manager.full_name || dept.manager.email;
            }
          }
        } else if (step.approver_type === 'manager') {
          approverName = 'Quản lý trực tiếp';
          approverEmail = '(Tùy theo người tạo)';
        }
        
        return {
          ...step,
          approver_name: approverName,
          approver_email: approverEmail
        };
      })
    );

    // 3. Display results
    console.log('📋 Enriched Steps:\n');
    enrichedSteps.forEach((step, index) => {
      console.log(`${index + 1}. ${step.step_name}`);
      console.log(`   Order: ${step.step_order}`);
      console.log(`   Type: ${step.approver_type}`);
      console.log(`   Approver ID: ${step.approver_id || 'null'}`);
      console.log(`   ✅ Approver Name: ${step.approver_name || '❌ MISSING'}`);
      console.log(`   ✅ Approver Email: ${step.approver_email || '❌ MISSING'}`);
      console.log('');
    });

    // 4. Check if all steps have approver info
    const allHaveInfo = enrichedSteps.every(s => s.approver_name && s.approver_email);
    
    if (allHaveInfo) {
      console.log('✅ ALL STEPS HAVE APPROVER INFO!');
      console.log('\n📝 Frontend should now display:');
      enrichedSteps.forEach((step, index) => {
        console.log(`   ${index + 1}. ${step.step_name}`);
        console.log(`      👤 ${step.approver_name}`);
        console.log(`      📧 ${step.approver_email}`);
      });
    } else {
      console.log('❌ SOME STEPS MISSING APPROVER INFO');
      const missing = enrichedSteps.filter(s => !s.approver_name || !s.approver_email);
      console.log('   Missing:', missing.map(s => s.step_name).join(', '));
    }

    // 5. Simulate API response
    console.log('\n📦 API Response Structure:');
    const apiResponse = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      steps: enrichedSteps.map(s => ({
        id: s.id,
        step_order: s.step_order,
        step_name: s.step_name,
        approver_type: s.approver_type,
        approver_name: s.approver_name,
        approver_email: s.approver_email,
        due_in_days: s.due_in_days
      }))
    };
    
    console.log(JSON.stringify(apiResponse, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testWorkflowAPI();
