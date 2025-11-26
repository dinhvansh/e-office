const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDocument100() {
  console.log('🔍 Checking document ID 100...\n');

  try {
    const doc = await prisma.documents.findUnique({
      where: { id: 100 },
      include: {
        owner: true,
        sign_request: {
          include: {
            signers: true,
            fields: true
          }
        },
        workflow_instance: {
          include: {
            workflow: true
          }
        },
        approvals: true
      }
    });

    if (!doc) {
      console.log('❌ Document 100 not found');
      return;
    }

    console.log('📄 Document Info:');
    console.log(`   ID: ${doc.id}`);
    console.log(`   Title: ${doc.title}`);
    console.log(`   Number: ${doc.document_number}`);
    console.log(`   Owner: ${doc.owner?.email || 'N/A'}`);
    console.log(`   Status: ${doc.status}`);
    console.log(`   Created: ${doc.created_at}`);
    console.log('');

    console.log('🔗 Related Data:');
    console.log(`   Sign Request: ${doc.sign_request_id ? 'YES (ID: ' + doc.sign_request_id + ')' : 'NO'}`);
    if (doc.sign_request) {
      console.log(`     Signers: ${doc.sign_request.signers?.length || 0}`);
      console.log(`     Fields: ${doc.sign_request.fields?.length || 0}`);
    }
    
    console.log(`   Workflow Instance: ${doc.workflow_instance_id ? 'YES (ID: ' + doc.workflow_instance_id + ')' : 'NO'}`);
    if (doc.workflow_instance) {
      console.log(`     Workflow: ${doc.workflow_instance.workflow?.name || 'N/A'}`);
      console.log(`     Approvals: ${doc.workflow_instance.approvals?.length || 0}`);
    }
    console.log('');

    // Check if document can be deleted
    console.log('🔒 Delete Protection Check:');
    
    const hasApprovals = doc.workflow_instance?.approvals?.length > 0;
    const hasSigners = doc.sign_request?.signers?.length > 0;
    const isPending = doc.status === 'pending_approval';
    const isApproved = doc.status === 'approved';
    
    if (isPending || isApproved) {
      console.log(`   ❌ Cannot delete: Status is "${doc.status}"`);
      console.log(`      Documents with pending/approved status cannot be deleted`);
    } else if (hasApprovals) {
      console.log(`   ⚠️  Has ${doc.workflow_instance.approvals.length} approval(s)`);
    } else if (hasSigners) {
      console.log(`   ⚠️  Has ${doc.sign_request.signers.length} signer(s)`);
    } else {
      console.log(`   ✅ Can be deleted (no restrictions)`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocument100();
