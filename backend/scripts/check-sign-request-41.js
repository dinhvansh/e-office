/**
 * Check sign request #41 details
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking Sign Request #41\n');
  
  const signRequest = await prisma.sign_requests.findUnique({
    where: { id: 41 },
    include: {
      document: {
        select: {
          id: true,
          title: true,
          document_number: true,
          status: true
        }
      },
      signers: {
        orderBy: { signing_order: 'asc' }
      }
    }
  });
  
  if (!signRequest) {
    console.error('❌ Sign request not found');
    return;
  }
  
  console.log('📝 Sign Request Info:');
  console.log(`  ID: ${signRequest.id}`);
  console.log(`  Status: ${signRequest.status}`);
  console.log(`  Document: ${signRequest.document?.title || 'Untitled'}`);
  console.log(`  Document Status: ${signRequest.document?.status}`);
  console.log('');
  
  console.log('👥 Signers:');
  signRequest.signers.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name} (${s.email})`);
    console.log(`     Status: ${s.status}`);
    console.log(`     Signing Order: ${s.signing_order || 'N/A'}`);
    console.log(`     Is Internal: ${s.is_internal}`);
    console.log(`     Has Token: ${s.signing_token ? 'Yes' : 'No'}`);
  });
  console.log('');
  
  // Check fields
  const fields = await prisma.sign_request_fields.findMany({
    where: { sign_request_id: 41 },
    include: {
      assigned_signer: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });
  
  console.log(`📋 Sign Fields: ${fields.length}`);
  if (fields.length === 0) {
    console.log('  ⚠️  NO FIELDS! This is why user cannot sign.');
  } else {
    fields.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.type} field on page ${f.page}`);
      console.log(`     Assigned to: ${f.assigned_signer?.name || 'Unassigned'}`);
      console.log(`     Required: ${f.required}`);
    });
  }
  console.log('');
  
  // Check approvals
  const approvals = await prisma.document_approvals.findMany({
    where: {
      document_id: signRequest.document_id
    },
    include: {
      approver: {
        select: {
          full_name: true,
          email: true
        }
      }
    }
  });
  
  console.log(`✅ Approvals: ${approvals.length}`);
  if (approvals.length > 0) {
    const pending = approvals.filter(a => a.action === 'pending');
    const approved = approvals.filter(a => a.action === 'approved');
    console.log(`  Pending: ${pending.length}`);
    console.log(`  Approved: ${approved.length}`);
    
    if (pending.length > 0) {
      console.log('\n  ⚠️  PENDING APPROVALS:');
      pending.forEach(a => {
        console.log(`    - ${a.approver?.full_name || a.approver?.email}`);
      });
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`  Sign Request Status: ${signRequest.status}`);
  console.log(`  Fields: ${fields.length}`);
  console.log(`  Signers: ${signRequest.signers.length}`);
  console.log(`  Pending Approvals: ${approvals.filter(a => a.action === 'pending').length}`);
  
  if (fields.length === 0) {
    console.log('\n❌ PROBLEM: No sign fields! User cannot sign without fields.');
    console.log('   Solution: Go to editor and add signature fields.');
  }
  
  const waitingSigners = signRequest.signers.filter(s => s.status === 'waiting_approval');
  if (waitingSigners.length > 0) {
    console.log('\n⏳ WAITING: Some signers are waiting for approval.');
    console.log('   Solution: Complete all approvals first.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
