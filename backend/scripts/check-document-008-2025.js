/**
 * Check Document 008/2025
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDocument() {
  console.log('\n🔍 Checking document 008/2025...\n');
  
  try {
    const doc = await prisma.documents.findFirst({
      where: {
        document_number: '008/2025'
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
    
    if (!signRequest) {
      console.log('\n❌ No sign request found');
      return;
    }
    
    console.log('\n📝 Sign Request Info:');
    console.log('  ID:', signRequest.id);
    console.log('  Status:', signRequest.status);
    console.log('  Workflow Type:', signRequest.workflow_type);
    
    console.log(`\n👥 Signers (${signRequest.signers.length}):\n`);
    
    signRequest.signers.forEach((signer, index) => {
      console.log(`${index + 1}. ${signer.name} (${signer.email})`);
      console.log(`   Role: ${signer.role || 'N/A'}`);
      console.log(`   Order: ${signer.signing_order}`);
      console.log(`   Internal: ${signer.is_internal}`);
      console.log(`   Status: ${signer.status}`);
      console.log('');
    });
    
    // Check for duplicates
    const emails = signRequest.signers.map(s => s.email);
    const duplicates = emails.filter((email, index) => emails.indexOf(email) !== index);
    
    if (duplicates.length > 0) {
      console.log('⚠️  DUPLICATE EMAILS FOUND:');
      duplicates.forEach(email => {
        console.log(`   - ${email}`);
      });
    } else {
      console.log('✅ No duplicate emails');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocument();
