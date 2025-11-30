const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

/**
 * Debug Progressive PDF for Document 030
 */

async function debugProgressivePDF() {
  console.log('🔍 Debugging Progressive PDF for Document 030\n');

  try {
    // Get document
    const document = await prisma.documents.findFirst({
      where: { document_number: '030/2025' },
      include: {
        sign_request: {
          include: {
            signers: {
              orderBy: { signing_order: 'asc' }
            }
          }
        }
      }
    });

    if (!document || !document.sign_request) {
      console.log('❌ Document or sign request not found');
      return;
    }

    console.log('📄 Document:', {
      id: document.id,
      number: document.document_number,
      title: document.title,
      status: document.status,
      file_path: document.file_path,
      signed_file_path: document.signed_file_path
    });

    const signRequest = document.sign_request;
    console.log('\n📝 Sign Request:', {
      id: signRequest.id,
      status: signRequest.status,
      workflow_type: signRequest.workflow_type
    });

    // Get fields
    const fields = await prisma.sign_request_fields.findMany({
      where: { sign_request_id: signRequest.id },
      orderBy: { id: 'asc' }
    });

    console.log(`\n📋 Fields: ${fields.length} total`);
    fields.forEach(field => {
      console.log(`  Field #${field.id}:`);
      console.log(`    Type: ${field.type}`);
      console.log(`    Page: ${field.page}`);
      console.log(`    Position: (${field.x}, ${field.y})`);
      console.log(`    Size: ${field.width}x${field.height}`);
      console.log(`    Assigned to signer: ${field.assigned_signer_id || 'N/A'}`);
    });

    // Check signers and their signatures
    console.log(`\n👥 Signers: ${signRequest.signers.length} total\n`);
    
    for (const signer of signRequest.signers) {
      console.log(`  Signer #${signer.id}: ${signer.name}`);
      console.log(`    Order: ${signer.signing_order}`);
      console.log(`    Status: ${signer.status}`);
      console.log(`    Signed at: ${signer.signed_at || 'Not yet'}`);
      console.log(`    Has signature_data: ${!!signer.signature_data}`);
      console.log(`    Has position_data: ${!!signer.position_data}`);
      
      if (signer.position_data) {
        console.log(`    Position data:`, JSON.stringify(signer.position_data, null, 2));
        
        // Check if position_data contains field signatures
        if (typeof signer.position_data === 'object') {
          const fieldSignatures = signer.position_data;
          const fieldIds = Object.keys(fieldSignatures);
          console.log(`    Field signatures: ${fieldIds.length} fields`);
          
          for (const fieldId of fieldIds) {
            const field = fields.find(f => f.id === parseInt(fieldId));
            const signatureData = fieldSignatures[fieldId];
            console.log(`      Field #${fieldId} (${field?.type || 'unknown'}):`);
            console.log(`        Has data: ${!!signatureData}`);
            console.log(`        Data length: ${signatureData?.length || 0} chars`);
            console.log(`        Is base64 image: ${signatureData?.startsWith('data:image/') || false}`);
          }
        }
      }
      
      // Check external field values
      const externalValues = await prisma.sign_request_field_values.findMany({
        where: { signer_id: signer.id },
        include: { field: true }
      });
      
      if (externalValues.length > 0) {
        console.log(`    External field values: ${externalValues.length}`);
        externalValues.forEach(fv => {
          console.log(`      Field #${fv.field_id} (${fv.field.type}): ${fv.value?.toString().substring(0, 50)}...`);
        });
      }
      
      console.log('');
    }

    // Check if signed PDF exists
    if (document.signed_file_path) {
      const signedPdfPath = path.resolve(__dirname, '../../../', document.signed_file_path);
      const exists = fs.existsSync(signedPdfPath);
      const size = exists ? fs.statSync(signedPdfPath).size : 0;
      
      console.log('\n📄 Signed PDF:');
      console.log(`  Path: ${document.signed_file_path}`);
      console.log(`  Exists: ${exists ? '✅' : '❌'}`);
      console.log(`  Size: ${(size / 1024).toFixed(2)} KB`);
      
      if (exists) {
        const stats = fs.statSync(signedPdfPath);
        console.log(`  Modified: ${stats.mtime}`);
      }
    } else {
      console.log('\n📄 Signed PDF: ❌ Not generated yet');
    }

    // Analysis
    console.log('\n🔍 Analysis:');
    
    const signedSigners = signRequest.signers.filter(s => 
      s.status === 'signed' || s.status === 'completed'
    );
    console.log(`  Signed signers: ${signedSigners.length}/${signRequest.signers.length}`);
    
    const signersWithData = signedSigners.filter(s => 
      s.position_data && typeof s.position_data === 'object' && Object.keys(s.position_data).length > 0
    );
    console.log(`  Signers with position_data: ${signersWithData.length}/${signedSigners.length}`);
    
    if (signedSigners.length > 0 && signersWithData.length === 0) {
      console.log('  ⚠️  WARNING: Signers have signed but no position_data found!');
      console.log('  This means signatures were not saved properly.');
    }
    
    if (signedSigners.length > 0 && !document.signed_file_path) {
      console.log('  ⚠️  WARNING: Signers have signed but no progressive PDF generated!');
      console.log('  Progressive PDF generation may have failed.');
    }
    
    if (document.signed_file_path && signersWithData.length > 0) {
      console.log('  ✅ Progressive PDF should contain signatures');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

debugProgressivePDF();
