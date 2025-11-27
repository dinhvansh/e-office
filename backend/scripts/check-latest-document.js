/**
 * Check latest document with workflow and signers
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking Latest Document\n');
  
  // Get latest document
  const document = await prisma.documents.findFirst({
    orderBy: { created_at: 'desc' },
    include: {
      document_type: true,
      sign_request: {
        include: {
          signers: {
            orderBy: { signing_order: 'asc' }
          }
        }
      }
    }
  });
  
  if (!document) {
    console.log('❌ No documents found');
    return;
  }
  
  console.log('📄 Document Info:');
  console.log(`  ID: ${document.id}`);
  console.log(`  Title: ${document.title || 'Untitled'}`);
  console.log(`  Status: ${document.status}`);
  console.log(`  Created: ${document.created_at.toISOString()}`);
  console.log(`  Document Type: ${document.document_type?.name || 'N/A'}`);
  console.log(`  Requires Approval: ${document.document_type?.require_approval || false}`);
  console.log(`  Requires Signing: ${document.document_type?.require_digital_signing || false}`);
  console.log('');
  
  // Check workflow instance
  const workflowInstance = await prisma.workflow_instances.findFirst({
    where: { document_id: document.id },
    include: {
      workflow: {
        include: {
          steps: {
            orderBy: { step_order: 'asc' }
          }
        }
      }
    }
  });
  
  if (workflowInstance) {
    console.log('🔄 Workflow Instance:');
    console.log(`  ID: ${workflowInstance.id}`);
    console.log(`  Workflow: ${workflowInstance.workflow.name}`);
    console.log(`  Is Template: ${workflowInstance.workflow.is_template}`);
    console.log(`  Created For Doc: ${workflowInstance.workflow.created_for_doc}`);
    console.log(`  Status: ${workflowInstance.status}`);
    console.log(`  Steps: ${workflowInstance.workflow.steps.length}`);
    console.log('');
    
    // Show steps
    console.log('📋 Workflow Steps:');
    workflowInstance.workflow.steps.forEach((step, i) => {
      console.log(`  ${i + 1}. ${step.step_name || `Step ${step.step_order}`}`);
      console.log(`     Type: ${step.approver_type}`);
      console.log(`     Approver ID: ${step.approver_id}`);
      console.log(`     Participant Role: ${step.participant_role || 'N/A'}`);
    });
    console.log('');
    
    // Check approvals
    const approvals = await prisma.document_approvals.findMany({
      where: { document_id: document.id },
      include: {
        approver: {
          select: { id: true, full_name: true, email: true }
        },
        workflow_step: {
          select: { step_order: true, step_name: true }
        }
      },
      orderBy: { created_at: 'asc' }
    });
    
    console.log(`✅ Approvals (${approvals.length}):` );
    approvals.forEach((approval, i) => {
      console.log(`  ${i + 1}. Step ${approval.workflow_step?.step_order}: ${approval.workflow_step?.step_name}`);
      console.log(`     Approver: ${approval.approver?.full_name || 'N/A'} (${approval.approver?.email || 'N/A'})`);
      console.log(`     Status: ${approval.action}`);
      console.log(`     Created: ${approval.created_at.toISOString()}`);
    });
    console.log('');
  } else {
    console.log('⚠️  No workflow instance found');
    console.log('');
  }
  
  // Check sign request
  if (document.sign_request) {
    console.log('📝 Sign Request:');
    console.log(`  ID: ${document.sign_request.id}`);
    console.log(`  Status: ${document.sign_request.status}`);
    console.log(`  Signers: ${document.sign_request.signers.length}`);
    console.log('');
    
    if (document.sign_request.signers.length > 0) {
      console.log('👥 Signers:');
      document.sign_request.signers.forEach((signer, i) => {
        console.log(`  ${i + 1}. ${signer.name} (${signer.email})`);
        console.log(`     Role: ${signer.role || 'N/A'}`);
        console.log(`     Status: ${signer.status}`);
        console.log(`     Signing Order: ${signer.signing_order || 'N/A'}`);
        console.log(`     Is Internal: ${signer.is_internal}`);
        console.log(`     User ID: ${signer.user_id || 'N/A'}`);
      });
    } else {
      console.log('  ⚠️  No signers found!');
      console.log('  This is the problem - signers should have been created.');
    }
    console.log('');
  } else {
    console.log('⚠️  No sign request found');
    console.log('');
  }
  
  // Summary
  console.log('📊 Summary:');
  console.log(`  Document: ${document.id} - ${document.status}`);
  console.log(`  Workflow: ${workflowInstance ? '✅ Yes' : '❌ No'}`);
  console.log(`  Approvals: ${workflowInstance ? (await prisma.document_approvals.count({ where: { document_id: document.id } })) : 0}`);
  console.log(`  Sign Request: ${document.sign_request ? '✅ Yes' : '❌ No'}`);
  console.log(`  Signers: ${document.sign_request?.signers.length || 0}`);
  
  // Check if this is the refactor issue
  if (workflowInstance && workflowInstance.workflow.created_for_doc === document.id) {
    console.log('\n✅ This is a CUSTOMIZED workflow (created for this document)');
    
    // Check if workflow was created before approvals
    const approvals = await prisma.document_approvals.findMany({
      where: { document_id: document.id },
      orderBy: { created_at: 'asc' }
    });
    
    if (approvals.length > 0) {
      const workflowCreated = workflowInstance.workflow.created_at;
      const firstApprovalCreated = approvals[0].created_at;
      
      if (workflowCreated <= firstApprovalCreated) {
        console.log('✅ Workflow created BEFORE approvals (correct order!)');
      } else {
        console.log('❌ Workflow created AFTER approvals (wrong order!)');
      }
    }
    
    // Check signer status
    if (document.sign_request?.signers.length > 0) {
      const waitingSigners = document.sign_request.signers.filter(s => s.status === 'waiting_approval');
      const pendingSigners = document.sign_request.signers.filter(s => s.status === 'pending');
      
      console.log(`\nSigner Status:`);
      console.log(`  waiting_approval: ${waitingSigners.length}`);
      console.log(`  pending: ${pendingSigners.length}`);
      
      const pendingApprovals = approvals.filter(a => a.action === 'pending');
      
      if (pendingApprovals.length > 0 && waitingSigners.length > 0) {
        console.log('✅ Signers waiting for approvals (correct!)');
      } else if (pendingApprovals.length === 0 && pendingSigners.length > 0) {
        console.log('✅ All approvals done, signers are pending (correct!)');
      } else if (waitingSigners.length === 0 && pendingSigners.length === 0) {
        console.log('⚠️  No signers with waiting_approval or pending status');
      }
    } else {
      console.log('\n❌ NO SIGNERS CREATED - This is the problem!');
      console.log('Expected: Signers should be created from workflow steps');
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
