const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPendingQuery() {
  console.log('🧪 Testing Pending Approvals Query...\n');

  try {
    const userId = 1;
    const tenantId = 1;

    console.log('Testing query with userId:', userId, 'tenantId:', tenantId);
    console.log('');

    const approvals = await prisma.document_approvals.findMany({
      where: {
        approver_user_id: userId,
        action: 'pending',
        document: {
          tenant_id: tenantId,
        },
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            original_file_name: true,
            document_number: true,
            document_type: {
              select: {
                name: true,
                code: true,
              }
            },
            owner: {
              select: {
                full_name: true,
                email: true,
              }
            }
          }
        },
        workflow: {
          select: {
            name: true,
          }
        },
        workflow_step: {
          select: {
            step_name: true,
          }
        },
      },
      orderBy: {
        due_date: 'asc',
      },
    });

    console.log('✅ Query successful!');
    console.log('   Found:', approvals.length, 'approvals');
    
    if (approvals.length > 0) {
      console.log('\n📋 First approval:');
      const first = approvals[0];
      console.log('   ID:', first.id);
      console.log('   Document:', first.document.title);
      console.log('   Workflow:', first.workflow.name);
      console.log('   Step:', first.workflow_step.step_name);
      console.log('   Owner:', first.document.owner?.full_name || first.document.owner?.email);
    }

    console.log('\n🎉 SUCCESS! Query works correctly!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testPendingQuery();
