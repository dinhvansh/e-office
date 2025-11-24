const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDocument(documentId) {
  try {
    console.log(`🔍 Checking Document #${documentId}\n`);

    const doc = await prisma.documents.findUnique({
      where: { id: documentId },
      include: {
        document_type: true,
        owner: true,
        sign_request: {
          include: {
            signers: {
              orderBy: { signing_order: 'asc' }
            }
          }
        },
        workflow_instance: {
          include: {
            workflow: true,
            current_step: true
          }
        },
        approvals: {
          include: {
            approver: true,
            workflow_step: true
          },
          orderBy: { created_at: 'desc' }
        }
      }
    });

    if (!doc) {
      console.log('❌ Document not found');
      return;
    }

    console.log('📄 Document Details:');
    console.log(`   ID: ${doc.id}`);
    console.log(`   Title: ${doc.title || 'N/A'}`);
    console.log(`   Number: ${doc.document_number}`);
    console.log(`   Status: ${doc.status}`);
    console.log(`   Owner: ${doc.owner.full_name || doc.owner.email}`);
    console.log(`   Created: ${doc.created_at.toLocaleString('vi-VN')}`);
    
    console.log(`\n📋 Document Type:`);
    console.log(`   Name: ${doc.document_type?.name || 'N/A'}`);
    console.log(`   Requires Approval: ${doc.document_type?.require_approval ? 'Yes' : 'No'}`);
    console.log(`   Requires Signing: ${doc.document_type?.require_digital_signing ? 'Yes' : 'No'}`);

    if (doc.workflow_instance) {
      console.log(`\n🔄 Workflow Instance:`);
      console.log(`   Workflow: ${doc.workflow_instance.workflow.name}`);
      console.log(`   Status: ${doc.workflow_instance.status}`);
      console.log(`   Current Step: ${doc.workflow_instance.current_step?.step_name || 'N/A'}`);
      console.log(`   Started: ${doc.workflow_instance.created_at.toLocaleString('vi-VN')}`);
      if (doc.workflow_instance.completed_at) {
        console.log(`   Completed: ${doc.workflow_instance.completed_at.toLocaleString('vi-VN')}`);
      }
    }

    if (doc.approvals && doc.approvals.length > 0) {
      console.log(`\n✅ Approvals (${doc.approvals.length}):`);
      doc.approvals.forEach((a, i) => {
        console.log(`\n   ${i + 1}. ${a.approver.full_name || a.approver.email}`);
        console.log(`      Step: ${a.workflow_step.step_name}`);
        console.log(`      Action: ${a.action}`);
        console.log(`      Comment: ${a.comment || 'N/A'}`);
        if (a.acted_at) {
          console.log(`      Acted At: ${a.acted_at.toLocaleString('vi-VN')}`);
        }
      });
    }

    if (doc.sign_request) {
      console.log(`\n📝 Sign Request:`);
      console.log(`   ID: ${doc.sign_request.id}`);
      console.log(`   Status: ${doc.sign_request.status}`);
      console.log(`   Workflow Type: ${doc.sign_request.workflow_type}`);
      
      if (doc.sign_request.signers && doc.sign_request.signers.length > 0) {
        console.log(`\n   Signers (${doc.sign_request.signers.length}):`);
        doc.sign_request.signers.forEach((s, i) => {
          console.log(`\n   ${i + 1}. ${s.name} (${s.email})`);
          console.log(`      Order: ${s.signing_order}`);
          console.log(`      Status: ${s.status}`);
          console.log(`      Signed At: ${s.signed_at ? s.signed_at.toLocaleString('vi-VN') : 'Not yet'}`);
          console.log(`      Has Token: ${s.signing_token ? 'Yes' : 'No'}`);
          if (s.signing_token) {
            console.log(`      URL: http://localhost:3000/sign/${s.signing_token}`);
          }
        });
      }
    } else {
      console.log(`\n📝 Sign Request: None`);
      console.log(`   Sign Request ID: ${doc.sign_request_id || 'N/A'}`);
    }

    console.log('\n━'.repeat(60));
    console.log('\n🔍 Analysis:');
    
    if (doc.document_type?.require_approval && !doc.workflow_instance) {
      console.log('   ⚠️  Document requires approval but no workflow instance');
    }
    
    if (doc.document_type?.require_digital_signing && !doc.sign_request) {
      console.log('   ⚠️  Document requires signing but no sign request');
    }
    
    if (doc.workflow_instance?.status === 'completed' && doc.status === 'pending_approval') {
      console.log('   ⚠️  Workflow completed but document still pending_approval');
    }
    
    if (doc.sign_request && doc.sign_request.status === 'draft') {
      console.log('   ⚠️  Sign request is still in draft (not sent)');
    }

    const completedApprovals = doc.approvals?.filter(a => a.action === 'approved').length || 0;
    const totalApprovals = doc.approvals?.length || 0;
    
    if (totalApprovals > 0) {
      console.log(`   ℹ️  Approvals: ${completedApprovals}/${totalApprovals} approved`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const documentId = parseInt(process.argv[2]) || 96;
checkDocument(documentId);
