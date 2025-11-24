const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDocAfterApproval(documentId) {
  try {
    console.log(`🔍 Checking Document #${documentId} After Approval\n`);

    const doc = await prisma.documents.findUnique({
      where: { id: documentId },
      include: {
        sign_request: {
          include: {
            signers: {
              orderBy: { signing_order: 'asc' }
            }
          }
        },
        workflow_instance: true
      }
    });

    if (!doc) {
      console.log('❌ Document not found');
      return;
    }

    console.log('📄 Document Status:');
    console.log(`   ID: ${doc.id}`);
    console.log(`   Number: ${doc.document_number}`);
    console.log(`   Status: ${doc.status}`);
    console.log(`   Sign Request ID: ${doc.sign_request_id || 'N/A'}`);

    if (doc.workflow_instance) {
      console.log(`\n🔄 Workflow Instance:`);
      console.log(`   Status: ${doc.workflow_instance.status}`);
      console.log(`   Completed At: ${doc.workflow_instance.completed_at ? doc.workflow_instance.completed_at.toLocaleString('vi-VN') : 'Not yet'}`);
    }

    if (doc.sign_request) {
      console.log(`\n📝 Sign Request:`);
      console.log(`   ID: ${doc.sign_request.id}`);
      console.log(`   Status: ${doc.sign_request.status}`);
      console.log(`   Workflow Type: ${doc.sign_request.workflow_type}`);
      
      if (doc.sign_request.signers && doc.sign_request.signers.length > 0) {
        console.log(`\n   👥 Signers (${doc.sign_request.signers.length}):`);
        doc.sign_request.signers.forEach((s, i) => {
          console.log(`\n   ${i + 1}. ${s.name} (${s.email})`);
          console.log(`      Order: ${s.signing_order}`);
          console.log(`      Status: ${s.status}`);
          console.log(`      Has Token: ${s.signing_token ? '✅ Yes' : '❌ No'}`);
          if (s.signing_token) {
            console.log(`      URL: http://localhost:3000/sign/${s.signing_token}`);
          }
        });
      } else {
        console.log(`\n   ⚠️  No signers found!`);
      }
    } else {
      console.log(`\n❌ No sign request found!`);
    }

    console.log('\n━'.repeat(60));
    console.log('\n🔍 Analysis:');
    
    const expectedStatus = 'pending_signature';
    const expectedSRStatus = 'pending';
    
    if (doc.status === expectedStatus) {
      console.log(`   ✅ Document status correct: ${doc.status}`);
    } else {
      console.log(`   ❌ Document status wrong: ${doc.status} (expected: ${expectedStatus})`);
    }
    
    if (doc.sign_request?.status === expectedSRStatus) {
      console.log(`   ✅ Sign request status correct: ${doc.sign_request.status}`);
    } else {
      console.log(`   ❌ Sign request status wrong: ${doc.sign_request?.status || 'N/A'} (expected: ${expectedSRStatus})`);
    }
    
    const allHaveTokens = doc.sign_request?.signers?.every(s => !!s.signing_token) || false;
    if (allHaveTokens && doc.sign_request?.signers?.length > 0) {
      console.log(`   ✅ All signers have tokens`);
    } else {
      console.log(`   ❌ Not all signers have tokens`);
    }

    if (doc.status === expectedStatus && doc.sign_request?.status === expectedSRStatus && allHaveTokens) {
      console.log('\n🎉 SUCCESS! Document moved to signing phase correctly!');
    } else {
      console.log('\n⚠️  ISSUE! Document did not move to signing phase correctly.');
      console.log('\n💡 Possible causes:');
      console.log('   1. autoSendSignRequest() failed');
      console.log('   2. Sign request was not sent');
      console.log('   3. Check backend logs for errors');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const documentId = parseInt(process.argv[2]) || 96;
checkDocAfterApproval(documentId);
