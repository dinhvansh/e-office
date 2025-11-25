const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DOCUMENT_NUMBER = '031/2025'; // Change this

async function checkDocument() {
  console.log('\n🔍 CHECK DOCUMENT');
  console.log('='.repeat(60));
  console.log(`📝 Document Number: ${DOCUMENT_NUMBER}`);
  
  try {
    // Find document by number
    const doc = await prisma.documents.findFirst({
      where: {
        document_number: DOCUMENT_NUMBER
      },
      include: {
        sign_request: {
          include: {
            signers: true,
            fields: true
          }
        }
      }
    });

    if (!doc) {
      console.log('❌ Document not found');
      return;
    }

    console.log('\n📄 Document Info:');
    console.log(`   ID: ${doc.id}`);
    console.log(`   Title: ${doc.title || doc.original_file_name}`);
    console.log(`   Number: ${doc.document_number}`);
    console.log(`   Status: ${doc.status}`);
    console.log(`   Has Sign Request: ${doc.sign_request ? 'Yes' : 'No'}`);

    if (!doc.sign_request) {
      console.log('\n⚠️  No sign request found for this document');
      return;
    }

    const signRequest = doc.sign_request;
    console.log('\n📝 Sign Request Info:');
    console.log(`   ID: ${signRequest.id}`);
    console.log(`   Status: ${signRequest.status}`);

    console.log('\n👥 Signers:');
    for (const signer of signRequest.signers) {
      console.log(`\n   Signer #${signer.id}:`);
      console.log(`   - Email: ${signer.email}`);
      console.log(`   - Name: ${signer.name}`);
      console.log(`   - Status: ${signer.status}`);
      console.log(`   - Has Token: ${signer.signing_token ? 'Yes' : 'No'}`);
      
      if (signer.signing_token) {
        console.log(`   - URL: http://localhost:3000/sign/${signer.signing_token}`);
      }
    }

    console.log('\n📋 Fields:');
    if (signRequest.fields.length === 0) {
      console.log('   ⚠️  NO FIELDS FOUND!');
      console.log('   This is why signer cannot see fields.');
      console.log('\n💡 Solution:');
      console.log(`   1. Go to: http://localhost:3000/sign-requests/${signRequest.id}/editor`);
      console.log('   2. Click on PDF to add signature fields');
      console.log('   3. Assign fields to signers');
      console.log('   4. Click "Lưu" to save');
    } else {
      for (const field of signRequest.fields) {
        console.log(`\n   Field #${field.id}:`);
        console.log(`   - Type: ${field.type}`);
        console.log(`   - Label: ${field.label || 'No label'}`);
        console.log(`   - Position: ${field.x}%, ${field.y}%`);
        console.log(`   - Size: ${field.width}x${field.height}`);
        console.log(`   - Assigned to signer: ${field.assigned_signer_id || '⚠️ NOT ASSIGNED'}`);
        console.log(`   - Required: ${field.required}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('💡 Summary:');
    console.log('='.repeat(60));
    console.log(`   Document: ${doc.document_number}`);
    console.log(`   Sign Request: ${signRequest.id}`);
    console.log(`   Signers: ${signRequest.signers.length}`);
    console.log(`   Fields: ${signRequest.fields.length}`);
    
    if (signRequest.fields.length === 0) {
      console.log('\n❌ PROBLEM: No fields added yet!');
      console.log('   Add fields in editor before sending to signer.');
    } else {
      const unassignedFields = signRequest.fields.filter(f => !f.assigned_signer_id);
      if (unassignedFields.length > 0) {
        console.log(`\n⚠️  WARNING: ${unassignedFields.length} fields not assigned to any signer!`);
      } else {
        console.log('\n✅ All fields are assigned to signers');
      }
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocument();
