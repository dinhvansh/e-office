/**
 * Test combined tasks (approvals + signing) for user
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Testing combined tasks for approver user\n');

  try {
    const userId = 17; // approver user
    const tenantId = 1;

    // 1. Get approval tasks
    const approvals = await prisma.document_approvals.findMany({
      where: {
        approver_user_id: userId,
        action: 'pending'
      },
      include: {
        document: {
          select: {
            id: true,
            document_number: true,
            title: true,
            original_file_name: true,
            created_at: true,
            owner: {
              select: { full_name: true, email: true }
            }
          }
        },
        workflow_step: {
          select: { step_name: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    console.log(`📋 Approval Tasks: ${approvals.length}\n`);

    // 2. Get signing tasks
    const signRequests = await prisma.sign_requests.findMany({
      where: {
        tenant_id: tenantId,
        signers: {
          some: {
            user_id: userId,
            is_internal: true,
            status: { in: ['pending', 'otp_sent'] }
          }
        }
      },
      include: {
        document: {
          select: {
            id: true,
            document_number: true,
            title: true,
            original_file_name: true,
            created_at: true,
            owner: {
              select: { full_name: true, email: true }
            }
          }
        },
        signers: {
          where: { user_id: userId },
          select: {
            id: true,
            status: true,
            signing_order: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    console.log(`✍️ Signing Tasks: ${signRequests.length}\n`);

    // 3. Check for documents that need BOTH approval AND signing
    const documentIds = new Set();
    const approvalDocIds = approvals.map(a => a.document_id);
    const signingDocIds = signRequests.map(sr => sr.document_id);

    const bothTasks = approvalDocIds.filter(id => signingDocIds.includes(id));
    console.log(`🔄 Documents needing BOTH: ${bothTasks.length}\n`);

    // 4. Display combined list
    console.log('📊 Combined Task List:\n');

    const allTasks = [];

    // Add approval tasks
    approvals.forEach(approval => {
      const needsSigning = signingDocIds.includes(approval.document_id);
      allTasks.push({
        type: 'approval',
        needsSigning,
        document: approval.document,
        approval_id: approval.id,
        workflow_step: approval.workflow_step.step_name
      });
    });

    // Add signing tasks (that are NOT already in approvals)
    signRequests.forEach(sr => {
      if (!approvalDocIds.includes(sr.document_id)) {
        allTasks.push({
          type: 'signing',
          needsApproval: false,
          document: sr.document,
          sign_request_id: sr.id,
          signer_status: sr.signers[0]?.status
        });
      }
    });

    // Display
    allTasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.document.document_number || task.document.title}`);
      
      if (task.type === 'approval' && task.needsSigning) {
        console.log(`   🔄 CẢ HAI: Phê duyệt + Ký số`);
        console.log(`   → Button: "Phê duyệt" + "Ký ngay"`);
      } else if (task.type === 'approval') {
        console.log(`   ✅ CHỈ PHÊ DUYỆT`);
        console.log(`   → Button: "Phê duyệt"`);
      } else {
        console.log(`   ✍️ CHỈ KÝ SỐ`);
        console.log(`   → Button: "Ký ngay"`);
      }
      console.log();
    });

    console.log(`\n📊 Summary:`);
    console.log(`Total tasks: ${allTasks.length}`);
    console.log(`Approval only: ${allTasks.filter(t => t.type === 'approval' && !t.needsSigning).length}`);
    console.log(`Signing only: ${allTasks.filter(t => t.type === 'signing').length}`);
    console.log(`Both: ${allTasks.filter(t => t.type === 'approval' && t.needsSigning).length}`);

    console.log('\n✅ Test completed!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
