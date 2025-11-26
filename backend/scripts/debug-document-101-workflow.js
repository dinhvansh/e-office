const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugWorkflow() {
  console.log('🔍 DEBUGGING DOCUMENT #101 WORKFLOW\n');
  console.log('='.repeat(60));
  
  const doc = await prisma.documents.findUnique({
    where: { id: 101 },
    include: {
      sign_request: {
        include: {
          signers: { orderBy: { signing_order: 'asc' } }
        }
      },
      workflow_instance: {
        include: {
          workflow: {
            include: {
              steps: { orderBy: { step_order: 'asc' } }
            }
          }
        }
      },
      approvals: {
        include: {
          approver: {
            select: { id: true, email: true, full_name: true }
          },
          workflow_step: true
        },
        orderBy: { id: 'asc' }
      }
    }
  });

  if (!doc) {
    console.log('❌ Document not found');
    return;
  }

  console.log('\n📄 DOCUMENT:');
  console.log(`   ID: ${doc.id}`);
  console.log(`   Number: ${doc.document_number}`);
  console.log(`   Status: ${doc.status}`);

  console.log('\n🔄 WORKFLOW INSTANCE:');
  if (doc.workflow_instance) {
    const wi = doc.workflow_instance;
    console.log(`   ID: ${wi.id}`);
    console.log(`   Workflow: ${wi.workflow?.name || 'N/A'}`);
    console.log(`   Status: ${wi.status}`);
    console.log(`   Current Step Order: ${wi.current_step_order || 'N/A'}`);
    
    console.log('\n   📋 WORKFLOW STEPS:');
    if (wi.workflow?.steps) {
      wi.workflow.steps.forEach((step, idx) => {
        console.log(`   ${idx + 1}. ${step.step_name} (Order: ${step.step_order})`);
        console.log(`      Type: ${step.approver_type}`);
        console.log(`      Approver ID: ${step.approver_id || 'N/A'}`);
      });
    }
  }

  console.log('\n📋 APPROVALS:');
  if (doc.approvals && doc.approvals.length > 0) {
    doc.approvals.forEach((approval, idx) => {
      console.log(`   ${idx + 1}. Approval ID: ${approval.id}`);
      console.log(`      Step: ${approval.workflow_step?.step_name || 'N/A'} (Order: ${approval.workflow_step?.step_order || 'N/A'})`);
      console.log(`      Approver: ${approval.approver?.full_name || approval.approver?.email || 'N/A'} (ID: ${approval.approver_user_id})`);
      console.log(`      Action: ${approval.action || 'pending'}`);
      console.log(`      Acted At: ${approval.acted_at || 'Not acted'}`);
    });
  }

  console.log('\n✍️  SIGNERS:');
  if (doc.sign_request?.signers) {
    doc.sign_request.signers.forEach((signer, idx) => {
      console.log(`   ${idx + 1}. ${signer.email}`);
      console.log(`      Order: ${signer.signing_order}`);
      console.log(`      Status: ${signer.status}`);
      console.log(`      Is Internal: ${signer.is_internal}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n💡 ANALYSIS:');
  
  if (doc.workflow_instance && doc.approvals) {
    const pendingApprovals = doc.approvals.filter(a => !a.action || a.action === 'pending');
    const approvedCount = doc.approvals.filter(a => a.action === 'approved').length;
    
    console.log(`   Total Approvals: ${doc.approvals.length}`);
    console.log(`   Approved: ${approvedCount}`);
    console.log(`   Pending: ${pendingApprovals.length}`);
    
    if (pendingApprovals.length > 0) {
      console.log('\n   ⚠️  PENDING APPROVALS:');
      pendingApprovals.forEach(a => {
        console.log(`   - ${a.approver?.email || 'N/A'} needs to approve step "${a.workflow_step?.step_name || 'N/A'}"`);
      });
      
      console.log('\n   🔧 SOLUTION:');
      console.log('   User needs to approve remaining steps before signing can start.');
      console.log(`   Next approver: ${pendingApprovals[0].approver?.email || 'N/A'}`);
    }
    
    if (doc.workflow_instance.status === 'in_progress' && pendingApprovals.length === 0) {
      console.log('\n   ⚠️  All approved but workflow not completed!');
      console.log('   This is a bug - workflow should be completed.');
    }
  }
  
  console.log('\n');
}

debugWorkflow()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
