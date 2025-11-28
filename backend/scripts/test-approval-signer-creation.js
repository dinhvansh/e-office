/**
 * Test script to verify approval and signer creation logic
 * Tests the bug where workflow steps with participant_role='signer' 
 * are being created as both approvals and signers
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing Approval & Signer Creation Logic\n');

  try {
    // Find a document with workflow that has both approvers and signers
    const document = await prisma.documents.findFirst({
      where: {
        workflow_instance: {
          isNot: null
        }
      },
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
        },
        sign_request: {
          include: {
            signers: true
          }
        },
        approvals: {
          include: {
            workflow_step: true,
            approver: {
              select: { email: true, full_name: true }
            }
          }
        }
      }
    });

    if (!document) {
      console.log('❌ No document with workflow found');
      return;
    }

    console.log(`📄 Document: ${document.document_number} - ${document.title}`);
    console.log(`   Status: ${document.status}\n`);

    // Analyze workflow steps
    const workflow = document.workflow_instance?.workflow;
    if (!workflow) {
      console.log('❌ No workflow found');
      return;
    }

    console.log(`📋 Workflow: ${workflow.name}`);
    console.log(`   Total steps: ${workflow.steps.length}\n`);

    // Group steps by participant_role
    const approverSteps = workflow.steps.filter(s => 
      s.participant_role === 'approver' || !s.participant_role
    );
    const signerSteps = workflow.steps.filter(s => 
      s.participant_role === 'signer'
    );

    console.log('🔍 Workflow Steps Analysis:');
    console.log(`   Approver steps: ${approverSteps.length}`);
    console.log(`   Signer steps: ${signerSteps.length}\n`);

    // Show all steps with their roles
    console.log('📝 All Workflow Steps:');
    for (const step of workflow.steps) {
      const role = step.participant_role || 'approver (default)';
      console.log(`   ${step.step_order}. ${step.step_name} - Role: ${role}`);
      console.log(`      Type: ${step.approver_type}, ID: ${step.approver_id}`);
    }
    console.log();

    // Check approvals created
    console.log('✅ Approvals Created:');
    if (document.approvals.length === 0) {
      console.log('   None');
    } else {
      for (const approval of document.approvals) {
        const step = approval.workflow_step;
        const role = step?.participant_role || 'approver (default)';
        console.log(`   - ${approval.approver?.full_name || approval.approver?.email}`);
        console.log(`     Step: ${step?.step_name} (${role})`);
        console.log(`     Status: ${approval.action}`);
      }
    }
    console.log();

    // Check signers created
    console.log('✍️  Signers Created:');
    if (!document.sign_request || document.sign_request.signers.length === 0) {
      console.log('   None');
    } else {
      for (const signer of document.sign_request.signers) {
        console.log(`   - ${signer.name} (${signer.email})`);
        console.log(`     Role: ${signer.role}`);
        console.log(`     Order: ${signer.signing_order}`);
        console.log(`     Status: ${signer.status}`);
        console.log(`     Internal: ${signer.is_internal}`);
      }
    }
    console.log();

    // Detect the bug
    console.log('🐛 Bug Detection:');
    
    // Check if any signer steps were created as approvals
    const signerStepIds = signerSteps.map(s => s.id);
    const wrongApprovals = document.approvals.filter(a => 
      signerStepIds.includes(a.workflow_step_id)
    );

    if (wrongApprovals.length > 0) {
      console.log('   ❌ BUG FOUND: Signer steps created as approvals!');
      for (const approval of wrongApprovals) {
        const step = approval.workflow_step;
        console.log(`      - ${step?.step_name} (participant_role: ${step?.participant_role})`);
        console.log(`        Approver: ${approval.approver?.email}`);
      }
    } else {
      console.log('   ✅ No signer steps in approvals (correct)');
    }
    console.log();

    // Check if approver steps were created as signers
    const approverStepIds = approverSteps.map(s => s.id);
    const wrongSigners = document.sign_request?.signers.filter(signer => {
      // Find if this signer matches an approver step
      const matchingApproval = document.approvals.find(a => 
        a.approver?.email === signer.email && 
        approverStepIds.includes(a.workflow_step_id)
      );
      return !!matchingApproval;
    }) || [];

    if (wrongSigners.length > 0) {
      console.log('   ❌ BUG FOUND: Approver steps created as signers!');
      for (const signer of wrongSigners) {
        console.log(`      - ${signer.name} (${signer.email})`);
      }
    } else {
      console.log('   ✅ No approver steps in signers (correct)');
    }
    console.log();

    // Summary
    console.log('📊 Summary:');
    console.log(`   Expected approvals: ${approverSteps.length}`);
    console.log(`   Actual approvals: ${document.approvals.length}`);
    console.log(`   Expected signers: ${signerSteps.length}`);
    console.log(`   Actual signers: ${document.sign_request?.signers.length || 0}`);
    console.log();

    if (wrongApprovals.length > 0 || wrongSigners.length > 0) {
      console.log('❌ TEST FAILED: Bug detected in approval/signer creation');
    } else {
      console.log('✅ TEST PASSED: Approvals and signers created correctly');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
