/**
 * Check Document Full Flow (Approvals + Signers)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDocument() {
  const docNumber = process.argv[2] || '008/2025';
  
  console.log(`\n🔍 Checking full flow for document: ${docNumber}\n`);
  
  try {
    const doc = await prisma.documents.findFirst({
      where: {
        document_number: docNumber
      },
      include: {
        owner: {
          select: { email: true, full_name: true }
        }
      }
    });
    
    if (!doc) {
      console.log('❌ Document not found');
      return;
    }
    
    console.log('📄 Document Info:');
    console.log('  ID:', doc.id);
    console.log('  Number:', doc.document_number);
    console.log('  Title:', doc.title);
    console.log('  Owner:', doc.owner.full_name || doc.owner.email);
    console.log('  Status:', doc.status);
    
    // Find approvals
    const approvals = await prisma.approvals.findMany({
      where: {
        document_id: doc.id
      },
      include: {
        approver: {
          select: { email: true, full_name: true }
        }
      },
      orderBy: { step_order: 'asc' }
    });
    
    console.log(`\n✅ Approvals (${approvals.length}):\n`);
    
    if (approvals.length > 0) {
      approvals.forEach((approval, index) => {
        console.log(`${index + 1}. ${approval.approver.full_name || approval.approver.email}`);
        console.log(`   Email: ${approval.approver.email}`);
        console.log(`   Step: ${approval.step_order}`);
        console.log(`   Status: ${approval.status}`);
        console.log('');
      });
    } else {
      console.log('  (No approvals)');
    }
    
    // Find sign request
    const signRequest = await prisma.sign_requests.findFirst({
      where: {
        document_id: doc.id
      },
      include: {
        signers: {
          orderBy: { signing_order: 'asc' }
        }
      }
    });
    
    if (signRequest) {
      console.log(`\n✍️  Signers (${signRequest.signers.length}):\n`);
      
      signRequest.signers.forEach((signer, index) => {
        console.log(`${index + 1}. ${signer.name}`);
        console.log(`   Email: ${signer.email}`);
        console.log(`   Role: ${signer.role || 'N/A'}`);
        console.log(`   Order: ${signer.signing_order}`);
        console.log(`   Internal: ${signer.is_internal}`);
        console.log(`   Status: ${signer.status}`);
        console.log('');
      });
    } else {
      console.log('\n❌ No sign request found');
    }
    
    // Summary
    const totalParticipants = approvals.length + (signRequest?.signers.length || 0);
    console.log('\n📊 SUMMARY:');
    console.log(`  Total Approvers: ${approvals.length}`);
    console.log(`  Total Signers: ${signRequest?.signers.length || 0}`);
    console.log(`  Total Participants: ${totalParticipants}`);
    
    // Check for duplicates across all participants
    const allEmails = [
      ...approvals.map(a => a.approver.email),
      ...(signRequest?.signers.map(s => s.email) || [])
    ];
    
    const duplicates = allEmails.filter((email, index) => allEmails.indexOf(email) !== index);
    
    if (duplicates.length > 0) {
      console.log('\n⚠️  DUPLICATE PARTICIPANTS:');
      const uniqueDuplicates = [...new Set(duplicates)];
      uniqueDuplicates.forEach(email => {
        const count = allEmails.filter(e => e === email).length;
        console.log(`   - ${email} (appears ${count} times)`);
      });
    } else {
      console.log('\n✅ No duplicate participants');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocument();
