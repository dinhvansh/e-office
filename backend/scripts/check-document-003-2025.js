const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDocument003() {
  try {
    console.log('🔍 Checking Document 003/2025...\n');

    // Find document by number
    const document = await prisma.documents.findFirst({
      where: {
        document_number: '003/2025'
      },
      include: {
        owner: {
          select: { id: true, email: true, full_name: true }
        },
        sign_request: {
          include: {
            signers: {
              orderBy: { signing_order: 'asc' },
              include: {
                user: {
                  select: { id: true, email: true, full_name: true }
                }
              }
            }
          }
        }
      }
    });

    if (!document) {
      console.log('❌ Document 003/2025 not found');
      return;
    }

    console.log('📄 DOCUMENT INFO:');
    console.log(`   ID: ${document.id}`);
    console.log(`   Number: ${document.document_number}`);
    console.log(`   Title: ${document.title}`);
    console.log(`   Status: ${document.status}`);
    console.log(`   Owner: ${document.owner.full_name || document.owner.email}`);
    console.log('');

    // Check workflow instances
    const workflowInstances = await prisma.workflow_instances.findMany({
      where: {
        document_id: document.id
      },
      include: {
        workflow: {
          select: { id: true, name: true }
        }
      }
    });

    // Get approvals separately
    const approvals = await prisma.document_approvals.findMany({
      where: {
        document_id: document.id
      },
      orderBy: { id: 'asc' },
      include: {
        workflow_step: {
          select: { step_name: true, approver_type: true, step_order: true }
        },
        approver: {
          select: { id: true, email: true, full_name: true }
        }
      }
    });

    if (approvals.length > 0) {
      console.log('👥 NGƯỜI PHÊ DUYỆT (APPROVERS):');
      if (workflowInstances.length > 0) {
        console.log('   Workflow:', workflowInstances[0].workflow.name);
      }
      console.log('');
      
      approvals.forEach((approval, index) => {
        console.log(`   ${index + 1}. ${approval.workflow_step.step_name}`);
        console.log(`      Approver: ${approval.approver.full_name || approval.approver.email}`);
        console.log(`      Email: ${approval.approver.email}`);
        console.log(`      Type: ${approval.workflow_step.approver_type}`);
        console.log(`      Status: ${approval.action || 'pending'}`);
        console.log(`      Order: ${approval.workflow_step.step_order}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No approval workflow found');
      console.log('');
    }

    // Check signers
    if (document.sign_request && document.sign_request.signers.length > 0) {
      console.log('✍️  NGƯỜI KÝ (SIGNERS):');
      console.log(`   Sign Request ID: ${document.sign_request.id}`);
      console.log(`   Status: ${document.sign_request.status}`);
      console.log(`   Workflow Type: ${document.sign_request.workflow_type || 'sequential'}`);
      console.log('');

      document.sign_request.signers.forEach((signer, index) => {
        console.log(`   ${signer.signing_order}. ${signer.name}`);
        console.log(`      Email: ${signer.email}`);
        console.log(`      Role: ${signer.role || 'Người ký'}`);
        console.log(`      Status: ${signer.status}`);
        console.log(`      Is Internal: ${signer.is_internal ? 'Yes (nội bộ)' : 'No (bên ngoài)'}`);
        if (signer.user) {
          console.log(`      User: ${signer.user.full_name || signer.user.email}`);
        }
        console.log(`      Order: ${signer.signing_order}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No signers found');
      console.log('');
    }

    // Summary
    console.log('📊 SUMMARY:');
    console.log('   ═══════════════════════════════════════');
    
    if (approvals.length > 0) {
      console.log('   \n   🔵 APPROVAL FLOW (Phê duyệt):');
      approvals.forEach((approval, index) => {
        const status = approval.action === 'approved' ? '✅' : 
                      approval.action === 'rejected' ? '❌' : '⏳';
        console.log(`      ${status} Step ${approval.workflow_step.step_order}: ${approval.approver.full_name || approval.approver.email}`);
      });
    }

    if (document.sign_request && document.sign_request.signers.length > 0) {
      console.log('   \n   🟢 SIGNING FLOW (Ký điện tử):');
      document.sign_request.signers.forEach((signer) => {
        const status = signer.status === 'signed' || signer.status === 'completed' ? '✅' : 
                      signer.status === 'rejected' ? '❌' : '⏳';
        console.log(`      ${status} Order ${signer.signing_order}: ${signer.name} (${signer.is_internal ? 'Internal' : 'External'})`);
      });
    }

    console.log('   ═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocument003();
