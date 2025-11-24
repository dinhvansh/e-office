const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testApprovalDetail() {
  console.log('🔍 Test Approval Detail API...\n');

  try {
    // 1. Get first pending approval
    console.log('1️⃣ Finding pending approval...');
    const approval = await prisma.document_approvals.findFirst({
      where: {
        action: 'pending',
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

    if (!approval) {
      console.log('❌ No pending approvals found');
      return;
    }

    console.log('✅ Found approval:', {
      id: approval.id,
      document: approval.document.title,
      approver: approval.approver.email,
      step: `${approval.workflow_step.step_order}: ${approval.workflow_step.step_name}`,
    });

    // 2. Check document file
    console.log('\n2️⃣ Checking document file...');
    console.log('   Document ID:', approval.document.id);
    console.log('   File name:', approval.document.original_file_name);
    console.log('   File path:', approval.document.file_path);

    // 3. Get approval history for this document
    console.log('\n3️⃣ Getting approval history...');
    const history = await prisma.document_approvals.findMany({
      where: {
        document_id: approval.document_id,
      },
      include: {
        approver: {
          select: {
            full_name: true,
            email: true,
          }
        },
        workflow_step: {
          select: {
            step_order: true,
            step_name: true,
          }
        }
      },
      orderBy: {
        created_at: 'asc',
      }
    });

    console.log(`   Found ${history.length} approval records:`);
    history.forEach((h, i) => {
      console.log(`   ${i + 1}. Step ${h.workflow_step.step_order}: ${h.workflow_step.step_name}`);
      console.log(`      Approver: ${h.approver.full_name || h.approver.email}`);
      console.log(`      Status: ${h.action}`);
      if (h.comment) console.log(`      Comment: ${h.comment}`);
    });

    // 4. Test URL
    console.log('\n4️⃣ Test URLs:');
    console.log(`   Detail page: http://localhost:3000/approvals/${approval.id}`);
    console.log(`   API endpoint: http://localhost:4000/api/v1/approvals/${approval.id}`);
    console.log(`   PDF view: http://localhost:4000/api/v1/documents/${approval.document.id}/view`);

    console.log('\n🎉 Test complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testApprovalDetail();
