#!/usr/bin/env node
/**
 * Check document 015/2025 status
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Checking Document 015/2025 ===\n');

  // Find document
  const document = await prisma.documents.findFirst({
    where: {
      document_number: '015/2025'
    },
    include: {
      sign_request: {
        include: {
          signers: {
            include: {
              user: true
            },
            orderBy: {
              signing_order: 'asc'
            }
          }
        }
      },
      document_type: true
    }
  });

  if (!document) {
    console.log('❌ Document 015/2025 not found');
    return;
  }

  console.log('📄 Document Info:');
  console.log(`   ID: ${document.id}`);
  console.log(`   Number: ${document.document_number}`);
  console.log(`   Title: ${document.title}`);
  console.log(`   Status: ${document.status}`);
  console.log(`   Type: ${document.document_type?.name}`);
  console.log('');

  if (!document.sign_request) {
    console.log('⚠️  No sign request found for this document');
    return;
  }

  console.log('📝 Sign Request Info:');
  console.log(`   ID: ${document.sign_request.id}`);
  console.log(`   Status: ${document.sign_request.status}`);
  console.log(`   Workflow Type: ${document.sign_request.workflow_type}`);
  console.log('');

  console.log('👥 Signers:');
  document.sign_request.signers.forEach((signer, index) => {
    console.log(`\n   ${index + 1}. ${signer.name} (${signer.email})`);
    console.log(`      Order: ${signer.signing_order}`);
    console.log(`      Role: ${signer.role}`);
    console.log(`      Status: ${signer.status}`);
    console.log(`      User ID: ${signer.user_id || 'N/A'}`);
    if (signer.user) {
      console.log(`      User: ${signer.user.full_name} (${signer.user.email})`);
    }
    if (signer.signed_at) {
      console.log(`      Signed At: ${signer.signed_at}`);
    }
  });

  console.log('\n');

  // Check if vanqn95@gmail.com signed
  const vanSigner = document.sign_request.signers.find(s => 
    s.email === 'vanqn95@gmail.com' || s.user?.email === 'vanqn95@gmail.com'
  );

  if (vanSigner) {
    console.log('🔍 Van\'s Signer Record:');
    console.log(`   Status: ${vanSigner.status}`);
    console.log(`   Signed: ${vanSigner.signed_at ? 'Yes' : 'No'}`);
    if (vanSigner.signed_at) {
      console.log(`   Signed At: ${vanSigner.signed_at}`);
    }
  } else {
    console.log('❌ vanqn95@gmail.com not found in signers list');
  }

  console.log('\n');

  // Check what should happen
  const allSigned = document.sign_request.signers.every(s => 
    s.status === 'signed' || s.status === 'completed'
  );

  console.log('📊 Status Analysis:');
  console.log(`   All signers signed: ${allSigned ? 'Yes' : 'No'}`);
  console.log(`   Sign Request Status: ${document.sign_request.status}`);
  console.log(`   Document Status: ${document.status}`);
  console.log('');

  if (allSigned && document.sign_request.status !== 'completed') {
    console.log('⚠️  ISSUE: All signers signed but sign request status is not "completed"');
    console.log('   Expected: completed');
    console.log(`   Actual: ${document.sign_request.status}`);
  }

  if (allSigned && document.status !== 'signed') {
    console.log('⚠️  ISSUE: All signers signed but document status is not "signed"');
    console.log('   Expected: signed');
    console.log(`   Actual: ${document.status}`);
  }

  // Check approvals if any
  const approvals = await prisma.document_approvals.findMany({
    where: {
      document_id: document.id
    },
    include: {
      user: true
    },
    orderBy: {
      step_order: 'asc'
    }
  });

  if (approvals.length > 0) {
    console.log('\n✅ Approvals:');
    approvals.forEach((approval, index) => {
      console.log(`\n   ${index + 1}. ${approval.user?.full_name || approval.user?.email}`);
      console.log(`      Step: ${approval.step_order}`);
      console.log(`      Role: ${approval.participant_role}`);
      console.log(`      Status: ${approval.status}`);
      if (approval.approved_at) {
        console.log(`      Approved At: ${approval.approved_at}`);
      }
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
