const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugDocument() {
  console.log('🔍 DEBUGGING DOCUMENT 001/2025\n');
  console.log('=' .repeat(60));
  
  // 1. Find document by number
  const document = await prisma.documents.findFirst({
    where: {
      document_number: '001/2025'
    },
    include: {
      sign_request: {
        include: {
          signers: {
            orderBy: { signing_order: 'asc' }
          }
        }
      },
      workflow_instance: {
        include: {
          workflow: true
        }
      },
      approvals: {
        include: {
          approver: {
            select: { id: true, email: true, full_name: true }
          },
          workflow_step: true
        }
      }
    }
  });

  if (!document) {
    console.log('❌ Document 001/2025 not found');
    return;
  }

  console.log('\n📄 DOCUMENT INFO:');
  console.log(`   ID: ${document.id}`);
  console.log(`   Number: ${document.document_number}`);
  console.log(`   Title: ${document.title}`);
  console.log(`   Status: ${document.status}`);
  console.log(`   Owner ID: ${document.owner_id}`);

  // 2. Check sign request
  console.log('\n✍️  SIGN REQUEST:');
  if (document.sign_request) {
    console.log(`   ID: ${document.sign_request.id}`);
    console.log(`   Status: ${document.sign_request.status}`);
    console.log(`   Workflow Type: ${document.sign_request.workflow_type}`);
    console.log(`   Signers: ${document.sign_request.signers.length}`);
    
    console.log('\n   📋 SIGNERS DETAIL:');
    document.sign_request.signers.forEach((signer, idx) => {
      console.log(`   ${idx + 1}. ${signer.name || signer.email}`);
      console.log(`      Email: ${signer.email}`);
      console.log(`      Order: ${signer.signing_order}`);
      console.log(`      Status: ${signer.status}`);
      console.log(`      Is Internal: ${signer.is_internal}`);
      console.log(`      Signed At: ${signer.signed_at || 'Not signed'}`);
      console.log(`      Has Signature: ${signer.signature_data ? 'Yes' : 'No'}`);
    });
  } else {
    console.log('   ❌ No sign request found');
  }

  // 3. Check workflow instance
  console.log('\n🔄 WORKFLOW INSTANCE:');
  if (document.workflow_instance) {
    const instance = document.workflow_instance;
    console.log(`   ID: ${instance.id}`);
    console.log(`   Workflow: ${instance.workflow?.name || 'N/A'}`);
    console.log(`   Status: ${instance.status}`);
    console.log(`   Current Step: ${instance.current_step_order || 'N/A'}`);
  } else {
    console.log('   ❌ No workflow instance found');
  }
  
  // 4. Check approvals
  console.log('\n📋 APPROVALS:');
  if (document.approvals && document.approvals.length > 0) {
    document.approvals.forEach((approval, idx) => {
      console.log(`   ${idx + 1}. Step: ${approval.workflow_step?.step_name || 'N/A'}`);
      console.log(`      Approver: ${approval.approver?.full_name || approval.approver?.email || 'N/A'}`);
      console.log(`      Status: ${approval.action || 'pending'}`);
      console.log(`      Acted At: ${approval.acted_at || 'Not acted'}`);
    });
  } else {
    console.log('   ❌ No approvals found');
  }

  // 5. Calculate signing progress
  console.log('\n📊 SIGNING PROGRESS CALCULATION:');
  if (document.sign_request && document.sign_request.signers.length > 0) {
    const signers = document.sign_request.signers;
    const total = signers.length;
    const signed = signers.filter(s => 
      s.status === 'signed' || s.status === 'completed'
    ).length;
    const percentage = Math.round((signed / total) * 100);
    
    console.log(`   Total Signers: ${total}`);
    console.log(`   Signed: ${signed}`);
    console.log(`   Pending: ${total - signed}`);
    console.log(`   Progress: ${signed}/${total} (${percentage}%)`);
    
    if (signed === 0) {
      console.log('\n   ⚠️  WARNING: No signers have signed yet!');
      console.log('   Possible reasons:');
      console.log('   1. Approval completed but signers not notified');
      console.log('   2. Signer status not updated after approval');
      console.log('   3. Workflow not triggering signing process');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n💡 DIAGNOSIS:');
  
  // Check for issues
  const issues = [];
  
  if (document.sign_request) {
    const allSigned = document.sign_request.signers.every(s => 
      s.status === 'signed' || s.status === 'completed'
    );
    const anySigned = document.sign_request.signers.some(s => 
      s.status === 'signed' || s.status === 'completed'
    );
    
    if (!anySigned) {
      issues.push('❌ No signers have signed yet (0/2)');
    }
    
    if (document.sign_request.status === 'pending' && !anySigned) {
      issues.push('⚠️  Sign request status is "pending" but no signatures');
    }
  }
  
  if (document.workflow_instance && document.approvals && document.approvals.length > 0) {
    const allApproved = document.approvals.every(a => 
      a.action === 'approved'
    );
    
    if (allApproved && document.workflow_instance.status !== 'completed') {
      issues.push('⚠️  All approvals done but workflow not completed');
    }
  }
  
  if (issues.length > 0) {
    console.log('\n   Issues found:');
    issues.forEach(issue => console.log(`   ${issue}`));
  } else {
    console.log('   ✅ No obvious issues found');
  }
  
  console.log('\n');
}

debugDocument()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
