const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanTestData() {
  console.log('🧹 Cleaning test data...\n');

  try {
    let totalDeleted = 0;

    // Delete sign request related data
    try {
      console.log('1️⃣ Deleting sign request fields...');
      const fields = await prisma.sign_request_fields.deleteMany({});
      console.log(`   ✅ Deleted ${fields.count} sign request fields`);
      totalDeleted += fields.count;
    } catch (e) {
      console.log(`   ⚠️ Skipped: ${e.message}`);
    }

    try {
      console.log('2️⃣ Deleting signers...');
      const signers = await prisma.signers.deleteMany({});
      console.log(`   ✅ Deleted ${signers.count} signers`);
      totalDeleted += signers.count;
    } catch (e) {
      console.log(`   ⚠️ Skipped: ${e.message}`);
    }

    try {
      console.log('3️⃣ Deleting sign requests...');
      const signRequests = await prisma.sign_requests.deleteMany({});
      console.log(`   ✅ Deleted ${signRequests.count} sign requests`);
      totalDeleted += signRequests.count;
    } catch (e) {
      console.log(`   ⚠️ Skipped: ${e.message}`);
    }

    // Delete document related data
    try {
      console.log('4️⃣ Deleting document flow...');
      const documentFlow = await prisma.document_flow.deleteMany({});
      console.log(`   ✅ Deleted ${documentFlow.count} document flow records`);
      totalDeleted += documentFlow.count;
    } catch (e) {
      console.log(`   ⚠️ Skipped: ${e.message}`);
    }

    try {
      console.log('5️⃣ Deleting document permissions...');
      const docPerms = await prisma.document_permissions.deleteMany({});
      console.log(`   ✅ Deleted ${docPerms.count} document permissions`);
      totalDeleted += docPerms.count;
    } catch (e) {
      console.log(`   ⚠️ Skipped: ${e.message}`);
    }

    try {
      console.log('6️⃣ Deleting document tags...');
      const docTags = await prisma.document_tags.deleteMany({});
      console.log(`   ✅ Deleted ${docTags.count} document tags`);
      totalDeleted += docTags.count;
    } catch (e) {
      console.log(`   ⚠️ Skipped: ${e.message}`);
    }

    try {
      console.log('7️⃣ Deleting document versions...');
      const versions = await prisma.document_versions.deleteMany({});
      console.log(`   ✅ Deleted ${versions.count} document versions`);
      totalDeleted += versions.count;
    } catch (e) {
      console.log(`   ⚠️ Skipped: ${e.message}`);
    }

    try {
      console.log('8️⃣ Deleting audit logs...');
      const auditLogs = await prisma.audit_logs.deleteMany({});
      console.log(`   ✅ Deleted ${auditLogs.count} audit logs`);
      totalDeleted += auditLogs.count;
    } catch (e) {
      console.log(`   ⚠️ Skipped: ${e.message}`);
    }

    try {
      console.log('9️⃣ Deleting workflow instances...');
      const workflowInstances = await prisma.workflow_instances.deleteMany({});
      console.log(`   ✅ Deleted ${workflowInstances.count} workflow instances`);
      totalDeleted += workflowInstances.count;
    } catch (e) {
      console.log(`   ⚠️ Skipped: ${e.message}`);
    }

    try {
      console.log('🔟 Deleting document approvals...');
      const docApprovals = await prisma.document_approvals.deleteMany({});
      console.log(`   ✅ Deleted ${docApprovals.count} document approvals`);
      totalDeleted += docApprovals.count;
    } catch (e) {
      console.log(`   ⚠️ Skipped: ${e.message}`);
    }

    try {
      console.log('1️⃣1️⃣ Deleting documents...');
      const documents = await prisma.documents.deleteMany({});
      console.log(`   ✅ Deleted ${documents.count} documents`);
      totalDeleted += documents.count;
    } catch (e) {
      console.log(`   ⚠️ Skipped: ${e.message}`);
    }

    // Delete notifications
    try {
      console.log('1️⃣2️⃣ Deleting notifications...');
      const notifications = await prisma.notifications.deleteMany({});
      console.log(`   ✅ Deleted ${notifications.count} notifications`);
      totalDeleted += notifications.count;
    } catch (e) {
      console.log(`   ⚠️ Skipped: ${e.message}`);
    }

    // Delete password reset tokens
    try {
      console.log('1️⃣3️⃣ Deleting password reset tokens...');
      const resetTokens = await prisma.password_reset_tokens.deleteMany({});
      console.log(`   ✅ Deleted ${resetTokens.count} password reset tokens`);
      totalDeleted += resetTokens.count;
    } catch (e) {
      console.log(`   ⚠️ Skipped: ${e.message}`);
    }

    await prisma.$disconnect();

    console.log('\n✅ All test data cleaned successfully!');
    console.log(`\n📊 Total records deleted: ${totalDeleted}`);
    console.log('\n🎉 Database is now clean and ready for fresh testing!');

  } catch (error) {
    console.error('❌ Error cleaning data:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

cleanTestData();
