/**
 * Check Sign Request by Document Number
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSignRequest() {
  const documentNumber = process.argv[2] || 'TEST-MIXED-1764229797824';
  
  console.log(`\n🔍 Checking sign request for document: ${documentNumber}\n`);
  
  try {
    // Find document by number
    const document = await prisma.documents.findFirst({
      where: {
        document_number: documentNumber
      },
      select: {
        id: true,
        document_number: true,
        title: true,
        status: true,
        created_at: true
      }
    });
    
    if (!document) {
      console.log('❌ Document not found');
      return;
    }
    
    console.log('📄 Document Info:');
    console.log('  ID:', document.id);
    console.log('  Number:', document.document_number);
    console.log('  Title:', document.title);
    console.log('  Status:', document.status);
    console.log('  Created:', document.created_at);
    
    // Find sign request for this document
    const signRequest = await prisma.sign_requests.findFirst({
      where: {
        document_id: document.id
      },
      include: {
        signers: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            is_internal: true,
            signing_order: true,
            signed_at: true
          },
          orderBy: {
            signing_order: 'asc'
          }
        }
      }
    });
    
    if (!signRequest) {
      console.log('\n❌ No sign request found for this document');
      return;
    }
    
    console.log('\n📝 Sign Request Info:');
    console.log('  ID:', signRequest.id);
    console.log('  Status:', signRequest.status);
    console.log('  Workflow Type:', signRequest.workflow_type);
    console.log('  Title:', signRequest.title);
    console.log('  Created:', signRequest.created_at);
    console.log('  Auto Created:', signRequest.auto_created);
    
    console.log('\n👥 Signers:');
    signRequest.signers.forEach((signer, index) => {
      console.log(`  ${index + 1}. ${signer.name} (${signer.email})`);
      console.log(`     Status: ${signer.status}`);
      console.log(`     Internal: ${signer.is_internal}`);
      console.log(`     Order: ${signer.signing_order}`);
      console.log(`     Signed At: ${signer.signed_at || 'Not signed'}`);
    });
    
    // Check if can delete
    console.log('\n🔒 Delete Permission Check:');
    if (signRequest.status === 'draft') {
      console.log('  ✅ CAN DELETE - Status is "draft"');
    } else {
      console.log(`  ❌ CANNOT DELETE - Status is "${signRequest.status}" (must be "draft")`);
    }
    
    // Check if can cancel
    console.log('\n🚫 Cancel Permission Check:');
    if (signRequest.status === 'pending' || signRequest.status === 'in_progress') {
      console.log(`  ✅ CAN CANCEL - Status is "${signRequest.status}"`);
    } else {
      console.log(`  ❌ CANNOT CANCEL - Status is "${signRequest.status}" (must be "pending" or "in_progress")`);
    }
    
    // Check if can revoke
    console.log('\n↩️  Revoke Permission Check:');
    const allInternal = signRequest.signers.every(s => s.is_internal);
    if (signRequest.status === 'completed' && allInternal) {
      console.log('  ✅ CAN REVOKE - Status is "completed" and all signers are internal');
    } else {
      if (signRequest.status !== 'completed') {
        console.log(`  ❌ CANNOT REVOKE - Status is "${signRequest.status}" (must be "completed")`);
      }
      if (!allInternal) {
        console.log('  ❌ CANNOT REVOKE - Has external signers');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSignRequest();
