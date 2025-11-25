/**
 * Test Manager Approver Logic
 * Verify that when approver_type = 'manager', 
 * system correctly identifies document owner's manager
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testManagerApproverLogic() {
  console.log('🧪 Testing Manager Approver Logic\n');

  try {
    // 1. Check creator user and their manager
    console.log('1️⃣ Checking Creator User...');
    const creator = await prisma.users.findFirst({
      where: { email: 'creator@acme.local' },
      include: {
        manager: {
          select: {
            id: true,
            email: true,
            full_name: true,
            status: true
          }
        }
      }
    });

    if (!creator) {
      console.log('❌ Creator not found');
      return;
    }

    console.log('✅ Creator:', creator.email);
    console.log('   ID:', creator.id);
    console.log('   Manager ID:', creator.manager_id || 'null');
    
    if (creator.manager) {
      console.log('   ✅ Manager:', creator.manager.full_name || creator.manager.email);
      console.log('   ✅ Manager Email:', creator.manager.email);
      console.log('   ✅ Manager Status:', creator.manager.status);
    } else {
      console.log('   ❌ No manager assigned!');
      console.log('\n💡 Need to assign a manager to creator user');
      console.log('   Run: UPDATE users SET manager_id = <manager_user_id> WHERE id = ' + creator.id);
      
      // Try to find a suitable manager
      const potentialManager = await prisma.users.findFirst({
        where: {
          tenant_id: creator.tenant_id,
          status: 'active',
          id: { not: creator.id }
        },
        select: { id: true, email: true, full_name: true }
      });
      
      if (potentialManager) {
        console.log('\n   Suggested manager:', potentialManager.full_name || potentialManager.email);
        console.log('   ID:', potentialManager.id);
      }
      return;
    }

    // 2. Check HOPDONG workflow
    console.log('\n2️⃣ Checking HOPDONG Workflow...');
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
    console.log('   Steps:', workflow.steps.length);

    const managerStep = workflow.steps.find(s => s.approver_type === 'manager');
    if (!managerStep) {
      console.log('❌ No manager step found');
      return;
    }

    console.log('\n✅ Manager Step:', managerStep.step_name);
    console.log('   Order:', managerStep.step_order);
    console.log('   Type:', managerStep.approver_type);

    // 3. Test getApproversForStep logic
    console.log('\n3️⃣ Testing getApproversForStep...');
    
    // Create a test document
    const testDoc = await prisma.documents.findFirst({
      where: {
        owner_id: creator.id,
        tenant_id: creator.tenant_id
      },
      orderBy: { created_at: 'desc' }
    });

    if (!testDoc) {
      console.log('❌ No test document found');
      return;
    }

    console.log('✅ Test Document:', testDoc.id);
    console.log('   Owner ID:', testDoc.owner_id);

    // Import repository
    const { approvalsRepository } = require('../src/modules/approvals/approvals.repository');
    
    const approverIds = await approvalsRepository.getApproversForStep(
      managerStep.id,
      creator.tenant_id,
      testDoc.id // Pass documentId
    );

    console.log('\n✅ Approver IDs returned:', approverIds);
    
    if (approverIds.length === 0) {
      console.log('❌ No approvers found!');
      console.log('   Expected:', creator.manager_id);
    } else if (approverIds.includes(creator.manager_id)) {
      console.log('✅ CORRECT! Manager ID matches:', creator.manager_id);
      console.log('   Manager:', creator.manager.full_name || creator.manager.email);
    } else {
      console.log('❌ WRONG! Got:', approverIds);
      console.log('   Expected:', creator.manager_id);
    }

    // 4. Summary
    console.log('\n📊 Summary:');
    console.log('   Creator:', creator.email);
    console.log('   Manager:', creator.manager?.email || 'NOT SET');
    console.log('   Workflow Step:', managerStep.step_name);
    console.log('   Approver Type:', managerStep.approver_type);
    console.log('   Approvers Found:', approverIds.length);
    
    if (approverIds.length > 0 && approverIds.includes(creator.manager_id)) {
      console.log('\n✅ MANAGER APPROVER LOGIC WORKING!');
    } else {
      console.log('\n❌ MANAGER APPROVER LOGIC NOT WORKING');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testManagerApproverLogic();
