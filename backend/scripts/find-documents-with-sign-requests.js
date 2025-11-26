const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findDocuments() {
  console.log('🔍 FINDING DOCUMENTS WITH SIGN REQUESTS\n');
  
  // Find all documents with sign requests
  const documents = await prisma.documents.findMany({
    where: {
      sign_request_id: { not: null }
    },
    include: {
      sign_request: {
        include: {
          signers: {
            orderBy: { signing_order: 'asc' }
          }
        }
      },
      workflow_instance: true,
      approvals: {
        include: {
          approver: {
            select: { email: true, full_name: true }
          }
        }
      }
    },
    orderBy: { created_at: 'desc' },
    take: 10
  });

  console.log(`Found ${documents.length} documents with sign requests:\n`);
  
  documents.forEach((doc, idx) => {
    console.log(`${idx + 1}. Document #${doc.id}`);
    console.log(`   Number: ${doc.document_number || 'N/A'}`);
    console.log(`   Title: ${doc.title || 'N/A'}`);
    console.log(`   Status: ${doc.status}`);
    console.log(`   Created: ${doc.created_at}`);
    
    if (doc.sign_request) {
      const signers = doc.sign_request.signers;
      const signed = signers.filter(s => s.status === 'signed' || s.status === 'completed').length;
      console.log(`   Sign Request: ${doc.sign_request.status}`);
      console.log(`   Progress: ${signed}/${signers.length}`);
      
      signers.forEach((s, i) => {
        console.log(`      ${i + 1}. ${s.email} - ${s.status} (Order: ${s.signing_order})`);
      });
    }
    
    if (doc.workflow_instance) {
      console.log(`   Workflow: ${doc.workflow_instance.status}`);
    }
    
    if (doc.approvals && doc.approvals.length > 0) {
      console.log(`   Approvals: ${doc.approvals.length}`);
      doc.approvals.forEach((a, i) => {
        console.log(`      ${i + 1}. ${a.approver?.email || 'N/A'} - ${a.action || 'pending'}`);
      });
    }
    
    console.log('');
  });
}

findDocuments()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
