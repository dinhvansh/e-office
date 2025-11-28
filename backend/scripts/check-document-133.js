const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDocument133() {
  console.log('\n🔍 Checking Document 133...\n');
  
  try {
    // Get document with all relations
    const document = await prisma.documents.findUnique({
      where: { id: 133 },
      include: {
        sign_request: {
          include: {
            signers: {
              orderBy: { signing_order: 'asc' }
            }
          }
        },
        approvals: {
          orderBy: { id: 'asc' }
        }
      }
    });

    if (!document) {
      console.log('❌ Document 133 not found');
      return;
    }

    console.log('📄 Document Info:');
    console.log('  ID:', document.id);
    console.log('  Title:', document.title);
    console.log('  Document Number:', document.document_number);
    console.log('  Status:', document.status);
    console.log('  File Path:', document.file_path);
    console.log('  Signed File Path:', document.signed_file_path);
    console.log('  Created:', document.created_at);

    if (document.sign_request) {
      console.log('\n📝 Sign Request:');
      console.log('  ID:', document.sign_request.id);
      console.log('  Status:', document.sign_request.status);
      console.log('  Title:', document.sign_request.title);
      
      console.log('\n👥 Signers:');
      document.sign_request.signers.forEach((signer, index) => {
        console.log(`  ${index + 1}. ${signer.name} (${signer.email})`);
        console.log(`     Role: ${signer.role}`);
        console.log(`     Status: ${signer.status}`);
        console.log(`     Order: ${signer.signing_order}`);
        console.log(`     Is Internal: ${signer.is_internal}`);
        console.log(`     Signed At: ${signer.signed_at || 'Not signed'}`);
        console.log(`     Has Signature: ${signer.signature_data ? 'Yes' : 'No'}`);
      });
    }

    if (document.approvals && document.approvals.length > 0) {
      console.log('\n✅ Approvals:');
      document.approvals.forEach((approval, index) => {
        console.log(`  ${index + 1}. ID ${approval.id}`);
        console.log(`     Action: ${approval.action}`);
        console.log(`     Acted At: ${approval.acted_at || 'Not acted'}`);
      });
    }

    // Check if all signers have signed
    const allSigned = document.sign_request?.signers.every(s => 
      s.status === 'signed' || s.status === 'completed'
    );
    
    console.log('\n📊 Summary:');
    console.log('  All Signers Signed:', allSigned ? 'Yes ✅' : 'No ❌');
    console.log('  Has Signed PDF:', document.signed_file_path ? 'Yes ✅' : 'No ❌');
    console.log('  Sign Request Status:', document.sign_request?.status || 'N/A');
    console.log('  Document Status:', document.status);

    if (allSigned && !document.signed_file_path) {
      console.log('\n⚠️  WARNING: All signers have signed but signed PDF not generated!');
      console.log('   Need to generate signed PDF with signatures.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocument133();
