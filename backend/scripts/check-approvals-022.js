const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkApprovals() {
  try {
    console.log('🔍 Checking Approvals for Document 022/2025...\n');

    const document = await prisma.documents.findFirst({
      where: { document_number: '022/2025' },
      include: {
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                full_name: true,
                email: true
              }
            }
          },
          orderBy: { created_at: 'asc' }
        }
      }
    });

    if (!document) {
      console.log('❌ Document not found');
      return;
    }

    console.log('📄 Document:', document.id, document.document_number);
    console.log('   Approvals count:', document.approvals.length);
    console.log('\n');

    document.approvals.forEach((approval, index) => {
      console.log(`${index + 1}. Approval ID: ${approval.id}`);
      console.log(`   Approver: ${approval.approver.full_name} (${approval.approver.email})`);
      console.log(`   Status: ${approval.status}`);
      console.log(`   Comments: ${approval.comments || 'No comments'}`);
      console.log(`   Approved at: ${approval.approved_at?.toISOString() || 'N/A'}`);
      console.log(`   Rejected at: ${approval.rejected_at?.toISOString() || 'N/A'}`);
      console.log(`   Created at: ${approval.created_at?.toISOString()}`);
      console.log('\n');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkApprovals();
