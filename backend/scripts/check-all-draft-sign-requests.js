/**
 * Check All Draft Sign Requests
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDraftSignRequests() {
  console.log('\n🔍 Checking all DRAFT sign requests...\n');
  
  try {
    const draftSignRequests = await prisma.sign_requests.findMany({
      where: {
        status: 'draft'
      },
      include: {
        document: {
          select: {
            id: true,
            document_number: true,
            title: true,
            original_file_name: true,
            status: true
          }
        },
        signers: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            is_internal: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    
    if (draftSignRequests.length === 0) {
      console.log('❌ No draft sign requests found');
      return;
    }
    
    console.log(`✅ Found ${draftSignRequests.length} draft sign request(s):\n`);
    
    draftSignRequests.forEach((sr, index) => {
      console.log(`${index + 1}. Sign Request ID: ${sr.id}`);
      console.log(`   Document: ${sr.document.document_number || sr.document.title || sr.document.original_file_name}`);
      console.log(`   Document ID: ${sr.document.id}`);
      console.log(`   Document Status: ${sr.document.status}`);
      console.log(`   Sign Request Status: ${sr.status}`);
      console.log(`   Workflow Type: ${sr.workflow_type}`);
      console.log(`   Created: ${sr.created_at}`);
      console.log(`   Signers: ${sr.signers.length}`);
      sr.signers.forEach((signer, i) => {
        console.log(`     ${i + 1}. ${signer.name} (${signer.email}) - ${signer.status} - ${signer.is_internal ? 'Internal' : 'External'}`);
      });
      console.log('');
    });
    
    // Also check sign requests with other statuses
    console.log('\n📊 Sign Request Status Summary:');
    const allStatuses = await prisma.sign_requests.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });
    
    allStatuses.forEach(stat => {
      console.log(`  ${stat.status}: ${stat._count.status}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDraftSignRequests();
