/**
 * Test script for workflow order refactor
 * Tests that customized workflows are created BEFORE approvals/signers
 * and that signers have correct status based on approval requirements
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing Workflow Order Refactor\n');
  
  // Get test data
  const tenant = await prisma.tenants.findFirst();
  const user = await prisma.users.findFirst({
    where: { tenant_id: tenant.id }
  });
  const documentType = await prisma.document_types.findFirst({
    where: {
      tenant_id: tenant.id,
      require_approval: true,
      require_digital_signing: true
    }
  });
  
  if (!tenant || !user || !documentType) {
    console.error('❌ Missing test data. Please run seed scripts first.');
    return;
  }
  
  console.log('📋 Test Data:');
  console.log(`  Tenant: ${tenant.name} (ID: ${tenant.id})`);
  console.log(`  User: ${user.full_name} (ID: ${user.id})`);
  console.log(`  Document Type: ${documentType.name} (ID: ${documentType.id})`);
  console.log(`  Requires Approval: ${documentType.require_approval}`);
  console.log(`  Requires Signing: ${documentType.require_digital_signing}`);
  console.log(`  Default Workflow: ${documentType.default_workflow_id}\n`);
  
  // Test Scenario 1: Document with Customized Workflow
  console.log('📝 Test Scenario 1: Document with Customized Workflow');
  console.log('─'.repeat(60));
  
  // Create a test document (you would normally use the API)
  // For now, just check if the workflow order is correct by examining existing data
  
  // Find a document with customized workflow
  const customizedWorkflow = await prisma.workflows.findFirst({
    where: {
      tenant_id: tenant.id,
      is_template: false,
      created_for_doc: { not: null }
    },
    include: {
      steps: {
        orderBy: { step_order: 'asc' }
      }
    }
  });
  
  if (customizedWorkflow) {
    console.log(`✓ Found customized workflow: ID ${customizedWorkflow.id}`);
    console.log(`  Created for document: ${customizedWorkflow.created_for_doc}`);
    console.log(`  Based on template: ${customizedWorkflow.based_on_template}`);
    console.log(`  Steps: ${customizedWorkflow.steps.length}`);
    
    // Check if approvals exist for this workflow
    const approvals = await prisma.document_approvals.findMany({
      where: {
        document_id: customizedWorkflow.created_for_doc,
        workflow_id: customizedWorkflow.id
      }
    });
    
    console.log(`  Approvals created: ${approvals.length}`);
    
    if (approvals.length === customizedWorkflow.steps.length) {
      console.log('  ✅ All workflow steps have approvals');
    } else {
      console.log(`  ⚠️  Approval count mismatch: ${approvals.length} vs ${customizedWorkflow.steps.length}`);
    }
    
    // Check signers for this document
    const document = await prisma.documents.findUnique({
      where: { id: customizedWorkflow.created_for_doc },
      include: {
        sign_request: {
          include: {
            signers: true
          }
        }
      }
    });
    
    if (document?.sign_request) {
      console.log(`  Sign Request: ID ${document.sign_request.id}`);
      console.log(`  Signers: ${document.sign_request.signers.length}`);
      
      const waitingSigners = document.sign_request.signers.filter(s => s.status === 'waiting_approval');
      const pendingSigners = document.sign_request.signers.filter(s => s.status === 'pending');
      
      console.log(`    - waiting_approval: ${waitingSigners.length}`);
      console.log(`    - pending: ${pendingSigners.length}`);
      
      // Check if document has pending approvals
      const pendingApprovals = approvals.filter(a => a.action === 'pending');
      
      if (pendingApprovals.length > 0 && waitingSigners.length > 0) {
        console.log('  ✅ Signers are waiting for approvals (correct!)');
      } else if (pendingApprovals.length === 0 && pendingSigners.length > 0) {
        console.log('  ✅ All approvals done, signers are pending (correct!)');
      } else {
        console.log('  ⚠️  Status mismatch - check logic');
      }
    }
  } else {
    console.log('  ℹ️  No customized workflows found. Create a document with customized workflow to test.');
  }
  
  console.log('');
  
  // Test Scenario 2: Check workflow creation order
  console.log('📝 Test Scenario 2: Workflow Creation Order');
  console.log('─'.repeat(60));
  
  // Find documents created recently
  const recentDocs = await prisma.documents.findMany({
    where: {
      tenant_id: tenant.id,
      created_at: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    },
    include: {
      sign_request: {
        include: {
          signers: true
        }
      }
    },
    orderBy: { created_at: 'desc' },
    take: 5
  });
  
  console.log(`Found ${recentDocs.length} recent documents:\n`);
  
  for (const doc of recentDocs) {
    console.log(`Document #${doc.id}: ${doc.title || 'Untitled'}`);
    console.log(`  Status: ${doc.status}`);
    console.log(`  Created: ${doc.created_at.toISOString()}`);
    
    // Check for workflow instance
    const workflowInstance = await prisma.workflow_instances.findFirst({
      where: { document_id: doc.id },
      include: {
        workflow: {
          include: {
            steps: true
          }
        }
      }
    });
    
    if (workflowInstance) {
      console.log(`  Workflow: ${workflowInstance.workflow.name}`);
      console.log(`    - Is Template: ${workflowInstance.workflow.is_template}`);
      console.log(`    - Created For Doc: ${workflowInstance.workflow.created_for_doc}`);
      console.log(`    - Steps: ${workflowInstance.workflow.steps.length}`);
      
      // Check if this is a customized workflow
      if (!workflowInstance.workflow.is_template && workflowInstance.workflow.created_for_doc === doc.id) {
        console.log('    ✅ This is a customized workflow created for this document');
        
        // Verify workflow was created BEFORE approvals
        const approvals = await prisma.document_approvals.findMany({
          where: {
            document_id: doc.id,
            workflow_id: workflowInstance.workflow.id
          },
          orderBy: { created_at: 'asc' }
        });
        
        if (approvals.length > 0) {
          const workflowCreated = workflowInstance.workflow.created_at;
          const firstApprovalCreated = approvals[0].created_at;
          
          if (workflowCreated <= firstApprovalCreated) {
            console.log('    ✅ Workflow created BEFORE approvals (correct order!)');
          } else {
            console.log('    ❌ Workflow created AFTER approvals (wrong order!)');
          }
        }
      }
    }
    
    // Check signers
    if (doc.sign_request) {
      const signers = doc.sign_request.signers;
      console.log(`  Signers: ${signers.length}`);
      
      const statusCounts = {};
      signers.forEach(s => {
        statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
      });
      
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`    - ${status}: ${count}`);
      });
      
      // Check if status makes sense
      const pendingApprovals = await prisma.document_approvals.findMany({
        where: {
          document_id: doc.id,
          action: 'pending'
        }
      });
      
      const waitingSigners = signers.filter(s => s.status === 'waiting_approval');
      
      if (pendingApprovals.length > 0 && waitingSigners.length > 0) {
        console.log('    ✅ Signers waiting for approvals (correct!)');
      } else if (pendingApprovals.length === 0 && waitingSigners.length === 0) {
        console.log('    ✅ No pending approvals, no waiting signers (correct!)');
      }
    }
    
    console.log('');
  }
  
  // Summary
  console.log('📊 Summary');
  console.log('─'.repeat(60));
  
  const totalCustomWorkflows = await prisma.workflows.count({
    where: {
      tenant_id: tenant.id,
      is_template: false,
      created_for_doc: { not: null }
    }
  });
  
  const totalWaitingSigners = await prisma.signers.count({
    where: {
      status: 'waiting_approval',
      sign_request: {
        document: {
          tenant_id: tenant.id
        }
      }
    }
  });
  
  console.log(`Total customized workflows: ${totalCustomWorkflows}`);
  console.log(`Total signers waiting for approval: ${totalWaitingSigners}`);
  
  console.log('\n✅ Test completed!');
  console.log('\nTo fully test the refactor:');
  console.log('1. Create a new document with customized workflow via API');
  console.log('2. Check that workflow is created BEFORE approvals');
  console.log('3. Verify signers have status = "waiting_approval"');
  console.log('4. Complete all approvals');
  console.log('5. Verify signers status changes to "pending" and emails are sent');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
