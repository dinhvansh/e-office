/**
 * Simple test to debug approvals API
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSimple() {
  console.log('🔍 Testing approvals query...\n');

  try {
    // Get admin user
    const admin = await prisma.users.findFirst({
      where: { email: 'admin@acme.local' }
    });

    if (!admin) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log(`✅ Found admin: ${admin.email} (ID: ${admin.id})\n`);

    // Try simple query
    console.log('Testing simple query...');
    const approvals = await prisma.document_approvals.findMany({
      where: {
        approver_user_id: admin.id
      },
      take: 5
    });

    console.log(`✅ Found ${approvals.length} approvals\n`);

    // Try with includes
    console.log('Testing with includes...');
    const approvalsWithIncludes = await prisma.document_approvals.findMany({
      where: {
        approver_user_id: admin.id
      },
      take: 2,
      include: {
        workflow_instance: {
          include: {
            workflow: true,
            document: {
              include: {
                owner: true,
                document_type: true
              }
            }
          }
        },
        workflow_step: true,
        approver: true
      }
    });

    console.log(`✅ Found ${approvalsWithIncludes.length} approvals with includes\n`);

    if (approvalsWithIncludes.length > 0) {
      const approval = approvalsWithIncludes[0];
      console.log('Sample approval:');
      console.log(`  ID: ${approval.id}`);
      console.log(`  Action: ${approval.action}`);
      console.log(`  Document: ${approval.workflow_instance.document.document_number}`);
      console.log(`  Type: ${approval.workflow_instance.document.document_type.name}`);
      console.log(`  Owner: ${approval.workflow_instance.document.owner.email}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testSimple();
