const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Checking Sign Requests for Document #78\n');

    const signRequests = await prisma.sign_requests.findMany({
      where: {
        document_id: 78
      },
      include: {
        signers: {
          include: {
            user: true
          },
          orderBy: {
            signing_order: 'asc'
          }
        },
        fields: {
          orderBy: {
            id: 'asc'
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    console.log(`Found ${signRequests.length} sign request(s)\n`);

    for (const sr of signRequests) {
      console.log('='.repeat(80));
      console.log(`Sign Request #${sr.id}`);
      console.log('='.repeat(80));
      console.log('Status:', sr.status);
      console.log('Mode:', sr.mode);
      console.log('Created:', sr.created_at);
      console.log('Sent:', sr.sent_at);
      console.log('Completed:', sr.completed_at);
      console.log('');

      console.log(`📋 Fields (${sr.fields?.length || 0}):`);
      if (sr.fields) {
        sr.fields.forEach((field, idx) => {
          console.log(`  ${idx + 1}. ${field.field_type} - Page ${field.page_number}`);
          console.log(`     Position: (${field.x}, ${field.y}), Size: ${field.width}x${field.height}`);
          console.log(`     Signer ID: ${field.signer_id || 'N/A'}`);
        });
      }
      console.log('');

      console.log(`👥 Signers (${sr.signers.length}):`);
      sr.signers.forEach((signer, idx) => {
        const name = signer.user?.full_name || signer.name || signer.email;
        console.log(`  ${idx + 1}. [Order ${signer.signing_order}] ${name}`);
        console.log(`     Type: ${signer.is_internal ? 'internal' : 'external'}`);
        console.log(`     Status: ${signer.status}`);
        console.log(`     Signed at: ${signer.signed_at || 'Not signed'}`);
        
        if (signer.position_data) {
          console.log(`     Position data: YES`);
          try {
            const posData = typeof signer.position_data === 'string' 
              ? JSON.parse(signer.position_data) 
              : signer.position_data;
            console.log(`     Parsed data:`, JSON.stringify(posData, null, 2));
          } catch (e) {
            console.log(`     Raw data:`, JSON.stringify(signer.position_data).substring(0, 200));
          }
        } else {
          console.log(`     Position data: NO`);
        }
      });
      console.log('');

      // Check field values
      const fieldValues = await prisma.sign_request_field_values.findMany({
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
                          fv.signer?.name || 
                          fv.signer?.email || 'Unknown';
        console.log(`  ${idx + 1}. Field ${fv.field_id} - Signer: ${signerName}`);
        console.log(`     Has value: ${fv.value ? 'YES' : 'NO'}`);
        console.log(`     Signed at: ${fv.signed_at}`);
      });
      console.log('');

      if (sr.status === 'completed') {
        console.log('✅ Sign request is COMPLETED');
        console.log('📄 Signed PDF should be at: storage/tenant_1/documents/signed-' + sr.id + '.pdf');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
