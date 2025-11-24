const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRecentDocuments() {
  console.log('🔍 Checking recent documents and approvals\n');

  try {
    // Get recent documents
    const documents = await prisma.documents.findMany({
      orderBy: { created_at: 'desc' },
      take: 5,
      include: {
        owner: { select: { email: true, full_name: true } },
        document_type: { select: { name: true } },
        workflow_instance: {
          include: {
            workflow: { select: { name: true } },
            current_step: { select: { step_name: true } }
          }
        }
      }
    });

    console.log(`📄 Recent ${documents.length} documents:\n`);

    for (const doc of documents) {
      console.log(`ID: ${doc.id} - ${doc.title || doc.original_file_name}`);
      console.log(`   Type: ${doc.document_type?.name || 'N/A'}`);
      console.log(`   Owner: ${doc.owner?.email}`);
      console.log(`   Status: ${doc.status}`);
      console.log(`   Created: ${doc.created_at.toISOString()}`);
      
      if (doc.workflow_instance) {
        console.log(`   Workflow: ${doc.workflow_instance.workflow?.name}`);
        console.log(`   Current Step: ${doc.workflow_instance.current_step?.step_name}`);
        console.log(`   Workflow Status: ${doc.workflow_instance.status}`);
      } else {
        console.log(`   Workflow: None`);
      }
      console.log('');
    }

    // Get recent approvals
    console.log('\n📋 Recent approvals:\n');
    const approvals = await prisma.document_approvals.findMany({
      orderBy: { created_at: 'desc' },
      take: 10,
      include: {
        document: { select: { id: true, title: true, original_file_name: true } },
        approver: { select: { email: true, full_name: true } },
        workflow_step: { select: { step_name: true } }
      }
    });

    for (const approval of approvals) {
      console.log(`ID: ${approval.id}`);
      console.log(`   Document: ${approval.document?.title || approval.document?.original_file_name} (ID: ${approval.document_id})`);
      console.log(`   Approver: ${approval.approver?.email}`);
      console.log(`   Step: ${approval.workflow_step?.step_name}`);
      console.log(`   Action: ${approval.action}`);
      console.log(`   Created: ${approval.created_at.toISOString()}`);
      console.log('');
    }

    // Check admin's pending approvals
    console.log('\n👤 Admin pending approvals:\n');
    const admin = await prisma.users.findFirst({
      where: { email: 'admin@acme.local' }
    });

    if (admin) {
      const adminApprovals = await prisma.document_approvals.findMany({
        where: {
          approver_user_id: admin.id,
          action: 'pending'
        },
        include: {
          document: { 
            select: { 
              id: true, 
              title: true, 
              original_file_name: true,
              tenant_id: true 
            } 
          }
        }
      });

      console.log(`Found ${adminApprovals.length} pending approvals for admin\n`);
      
      adminApprovals.forEach((approval, idx) => {
        console.log(`${idx + 1}. Document ID: ${approval.document_id}`);
        console.log(`   Title: ${approval.document?.title || approval.document?.original_file_name}`);
        console.log(`   Approval ID: ${approval.id}`);
        console.log(`   Created: ${approval.created_at.toISOString()}`);
        console.log('');
      });
    }

    await prisma.$disconnect();
    console.log('✅ Check completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkRecentDocuments();
