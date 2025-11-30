const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Checking document TT200026/2025...\n');

    // Find document by number
    const document = await prisma.document.findFirst({
      where: {
        document_number: 'giay-de-nghi-thanh-toan-TT200026/2025'
      },
      include: {
        document_type: true,
        creator: true
      }
    });

    if (!document) {
      console.log('❌ Document not found');
      return;
    }

    console.log('📄 Document found:');
    console.log('  ID:', document.id);
    console.log('  Number:', document.document_number);
    console.log('  Title:', document.title);
    console.log('  Status:', document.status);
    console.log('  Type:', document.document_type?.name);
    console.log('  Creator:', document.creator?.full_name);
    console.log('');

    // Find sign requests for this document
    const signRequests = await prisma.signRequest.findMany({
      where: {
        document_id: document.id
      },
      include: {
        signers: {
          include: {
            user: true,
            external_org: true
          },
          orderBy: {
            order: 'asc'
          }
        },
        sign_request_fields: {
          orderBy: {
            id: 'asc'
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    console.log(`📝 Found ${signRequests.length} sign request(s)\n`);

    for (const sr of signRequests) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Sign Request #${sr.id}`);
      console.log(`${'='.repeat(80)}`);
      console.log('Status:', sr.status);
      console.log('Mode:', sr.mode);
      console.log('Created:', sr.created_at);
      console.log('Sent:', sr.sent_at);
      console.log('Completed:', sr.completed_at);
      console.log('');

      // Check fields
      console.log(`📋 Fields (${sr.sign_request_fields.length}):`);
      sr.sign_request_fields.forEach((field, idx) => {
        console.log(`  ${idx + 1}. ${field.field_type} - Page ${field.page_number}`);
        console.log(`     Position: (${field.x}, ${field.y}), Size: ${field.width}x${field.height}`);
        console.log(`     Signer ID: ${field.signer_id || 'N/A'}`);
        console.log(`     Value: ${field.value ? '✓ Has value' : '✗ No value'}`);
      });
      console.log('');

      // Check signers
      console.log(`👥 Signers (${sr.signers.length}):`);
      sr.signers.forEach((signer, idx) => {
        const name = signer.user?.full_name || signer.external_org?.name || signer.email;
        console.log(`  ${idx + 1}. [Order ${signer.order}] ${name}`);
        console.log(`     Type: ${signer.signer_type}`);
        console.log(`     Status: ${signer.status}`);
        console.log(`     Signed at: ${signer.signed_at || 'Not signed'}`);
        
        if (signer.position_data) {
          try {
            const posData = JSON.parse(signer.position_data);
            console.log(`     Position data: ${JSON.stringify(posData).substring(0, 100)}...`);
          } catch (e) {
            console.log(`     Position data: ${signer.position_data.substring(0, 100)}...`);
          }
        } else {
          console.log(`     Position data: None`);
        }
      });
      console.log('');

      // Check field values
      const fieldValues = await prisma.signRequestFieldValue.findMany({
        where: {
          sign_request_id: sr.id
        },
        include: {
          signer: {
            include: {
              user: true,
              external_org: true
            }
          }
        }
      });

      console.log(`✍️ Field Values (${fieldValues.length}):`);
      fieldValues.forEach((fv, idx) => {
        const signerName = fv.signer?.user?.full_name || 
                          fv.signer?.external_org?.name || 
                          fv.signer?.email || 'Unknown';
        console.log(`  ${idx + 1}. Field ${fv.field_id} - Signer: ${signerName}`);
        console.log(`     Value: ${fv.value ? '✓ Has value' : '✗ No value'}`);
        console.log(`     Signed at: ${fv.signed_at}`);
      });
      console.log('');

      // Check if we should regenerate
      if (sr.status === 'completed' && sr.completed_at) {
        console.log('🔄 This sign request is completed. Regenerating signed PDF...\n');
        
        // Import the PDF generation service
        const path = require('path');
        const pdfGenPath = path.join(__dirname, '../src/modules/signRequests/pdfGeneration.service.ts');
        
        console.log('⚠️  To regenerate, run:');
        console.log(`   node backend/scripts/regenerate-signed-pdf-${sr.id}.js`);
        console.log('');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
