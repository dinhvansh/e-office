const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugSendError() {
  try {
    console.log('🔍 Debugging Send Sign Request Error...\n');

    // Find the latest draft sign request
    const signRequest = await prisma.sign_requests.findFirst({
      where: {
        status: 'draft'
      },
      include: {
        document: true,
        signers: true,
        fields: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    if (!signRequest) {
      console.log('❌ No draft sign request found');
      return;
    }

    console.log('📋 Sign Request Details:');
    console.log('  ID:', signRequest.id);
    console.log('  Status:', signRequest.status);
    console.log('  Document:', signRequest.document?.title || 'N/A');
    console.log('  Document ID:', signRequest.document_id);
    console.log('');

    console.log('👥 Signers:', signRequest.signers.length);
    signRequest.signers.forEach((signer, index) => {
      console.log(`  ${index + 1}. ${signer.name} (${signer.email})`);
      console.log(`     Order: ${signer.signing_order}`);
      console.log(`     Internal: ${signer.is_internal}`);
      console.log(`     Status: ${signer.status}`);
      console.log(`     User ID: ${signer.user_id || 'N/A'}`);
    });
    console.log('');

    console.log('📝 Fields:', signRequest.fields.length);
    if (signRequest.fields.length > 0) {
      signRequest.fields.forEach((field, index) => {
        console.log(`  ${index + 1}. Type: ${field.type}`);
        console.log(`     Page: ${field.page}, Position: (${field.x}, ${field.y})`);
        console.log(`     Assigned to: ${field.assigned_signer_id || 'UNASSIGNED'}`);
        console.log(`     Required: ${field.required}`);
      });
      console.log('');

      // Check for validation issues
      const unassignedRequired = signRequest.fields.filter(f => f.required && !f.assigned_signer_id);
      if (unassignedRequired.length > 0) {
        console.log('⚠️  VALIDATION ISSUE:');
        console.log(`   ${unassignedRequired.length} required field(s) not assigned to any signer`);
        console.log('');
      }
    }

    // Check document exists
    if (!signRequest.document) {
      console.log('❌ ERROR: Document not found!');
      console.log('   Document ID:', signRequest.document_id);
      console.log('');
    }

    // Check signers have tokens
    const signersWithoutToken = signRequest.signers.filter(s => !s.signing_token);
    if (signersWithoutToken.length > 0) {
      console.log('ℹ️  Signers without token:', signersWithoutToken.length);
      console.log('   (Tokens will be generated when sending)');
      console.log('');
    }

    // Check email config
    console.log('📧 Email Configuration:');
    console.log('  SMTP_HOST:', process.env.SMTP_HOST || 'NOT SET');
    console.log('  SMTP_PORT:', process.env.SMTP_PORT || 'NOT SET');
    console.log('  SMTP_USER:', process.env.SMTP_USER || 'NOT SET');
    console.log('  SMTP_FROM:', process.env.SMTP_FROM || 'NOT SET');
    console.log('  FRONTEND_URL:', process.env.FRONTEND_URL || 'NOT SET');
    console.log('');

    // Summary
    console.log('📊 Summary:');
    console.log('  ✅ Sign request exists');
    console.log('  ✅ Status is draft');
    console.log(`  ${signRequest.signers.length > 0 ? '✅' : '❌'} Has signers (${signRequest.signers.length})`);
    console.log(`  ${signRequest.document ? '✅' : '❌'} Document exists`);
    
    if (signRequest.fields.length > 0) {
      const unassignedRequired = signRequest.fields.filter(f => f.required && !f.assigned_signer_id);
      console.log(`  ${unassignedRequired.length === 0 ? '✅' : '❌'} All required fields assigned`);
    } else {
      console.log('  ⚠️  No fields added (optional)');
    }
    
    console.log('');

    // Try to identify the error
    if (!signRequest.document) {
      console.log('🔴 LIKELY ERROR: Document not found');
      console.log('   Fix: Check if document ID', signRequest.document_id, 'exists');
    } else if (signRequest.signers.length === 0) {
      console.log('🔴 LIKELY ERROR: No signers added');
      console.log('   Fix: Add at least one signer');
    } else if (signRequest.fields.length > 0) {
      const unassignedRequired = signRequest.fields.filter(f => f.required && !f.assigned_signer_id);
      if (unassignedRequired.length > 0) {
        console.log('🔴 LIKELY ERROR: Required fields not assigned');
        console.log('   Fix: Assign all required fields to signers');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSendError();
