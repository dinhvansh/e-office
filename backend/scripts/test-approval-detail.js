const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testApprovalDetail() {
  console.log('🧪 Testing Approval Detail API...\n');

  try {
    // Step 1: Find a document approval
    console.log('1️⃣ Finding document approvals...');
    const approvals = await prisma.document_approvals.findMany({
      take: 5,
      orderBy: { id: 'desc' },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            tenant_id: true,
          }
        },
        workflow: {
          select: {
            id: true,
            name: true,
          }
        },
        workflow_step: {
          select: {
            id: true,
            step_order: true,
            step_name: true,
          }
        },
        approver: {
          select: {
            id: true,
            email: true,
            full_name: true,
          }
        }
      }
    });

    console.log(`✅ Found ${approvals.length} approvals`);
    
    if (approvals.length === 0) {
      console.log('⚠️  No approvals found. Creating test data...');
      return;
    }

    // Show first approval
    const approval = approvals[0];
    console.log('\n📋 First Approval:');
    console.log('   ID:', approval.id);
    console.log('   Action:', approval.action);
    console.log('   Document:', approval.document.title);
    console.log('   Workflow:', approval.workflow.name);
    console.log('   Step:', approval.workflow_step.step_name);
    console.log('   Approver:', approval.approver.full_name || approval.approver.email);
    console.log('   Approver ID:', approval.approver_user_id);

    // Step 2: Test the query that service uses
    console.log('\n2️⃣ Testing service query...');
    const testApproval = await prisma.document_approvals.findFirst({
      where: {
        id: approval.id,
      },
      include: {
        document: {
          include: {
            owner: {
              select: {
                id: true,
                email: true,
                full_name: true,
              }
            }
          }
        },
        workflow: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        },
        workflow_step: {
          select: {
            id: true,
            step_order: true,
            step_name: true,
            approver_type: true,
          }
        },
        approver: {
          select: {
            id: true,
            email: true,
            full_name: true,
          }
        }
      }
    });

    if (testApproval) {
      console.log('✅ Query successful!');
      console.log('   Document tenant_id:', testApproval.document.tenant_id);
      console.log('   Document owner:', testApproval.document.owner?.full_name || testApproval.document.owner?.email);
      console.log('   Workflow:', testApproval.workflow.name);
      console.log('   Step order:', testApproval.workflow_step.step_order);
      console.log('   Approver:', testApproval.approver.full_name || testApproval.approver.email);
    } else {
      console.log('❌ Query returned null');
    }

    // Step 3: Check for pending approvals
    console.log('\n3️⃣ Checking pending approvals...');
    const pendingApprovals = approvals.filter(a => a.action === 'pending');
    console.log(`✅ Found ${pendingApprovals.length} pending approvals`);
    
    if (pendingApprovals.length > 0) {
      const pending = pendingApprovals[0];
      console.log('\n📝 First Pending Approval:');
      console.log('   ID:', pending.id);
      console.log('   Document:', pending.document.title);
      console.log('   Approver ID:', pending.approver_user_id);
      console.log('   Approver:', pending.approver.full_name || pending.approver.email);
      console.log('\n🔗 Test URL: http://localhost:3000/approvals/' + pending.id);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testApprovalDetail();
