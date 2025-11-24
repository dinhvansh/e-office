const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearAllDocuments() {
  try {
    console.log('🗑️  Clearing All Documents and Sign Requests\n');
    console.log('⚠️  WARNING: This will delete ALL documents and related data!\n');

    // Count before deletion
    const docCount = await prisma.documents.count();
    const srCount = await prisma.sign_requests.count();
    const signerCount = await prisma.signers.count();
    const fieldCount = await prisma.sign_request_fields.count();
    const fieldValueCount = await prisma.sign_request_field_values.count();

    console.log('📊 Current data:');
    console.log(`   Documents: ${docCount}`);
    console.log(`   Sign Requests: ${srCount}`);
    console.log(`   Signers: ${signerCount}`);
    console.log(`   Fields: ${fieldCount}`);
    console.log(`   Field Values: ${fieldValueCount}\n`);

    if (docCount === 0) {
      console.log('✅ Database is already clean!');
      return;
    }

    console.log('🗑️  Deleting in order (respecting foreign keys)...\n');

    // Delete in correct order to respect foreign key constraints
    
    // 1. Delete field values first
    console.log('1️⃣ Deleting field values...');
    const deletedFieldValues = await prisma.sign_request_field_values.deleteMany({});
    console.log(`   ✅ Deleted ${deletedFieldValues.count} field values`);

    // 2. Delete fields
    console.log('2️⃣ Deleting fields...');
    const deletedFields = await prisma.sign_request_fields.deleteMany({});
    console.log(`   ✅ Deleted ${deletedFields.count} fields`);

    // 3. Delete signers
    console.log('3️⃣ Deleting signers...');
    const deletedSigners = await prisma.signers.deleteMany({});
    console.log(`   ✅ Deleted ${deletedSigners.count} signers`);

    // 4. Delete sign requests
    console.log('4️⃣ Deleting sign requests...');
    const deletedSignRequests = await prisma.sign_requests.deleteMany({});
    console.log(`   ✅ Deleted ${deletedSignRequests.count} sign requests`);

    // 5. Delete document attachments
    console.log('5️⃣ Deleting document attachments...');
    const deletedAttachments = await prisma.document_attachments.deleteMany({});
    console.log(`   ✅ Deleted ${deletedAttachments.count} attachments`);

    // 6. Delete document CC emails
    console.log('6️⃣ Deleting document CC emails...');
    const deletedCCs = await prisma.document_cc_emails.deleteMany({});
    console.log(`   ✅ Deleted ${deletedCCs.count} CC emails`);

    // 7. Delete document approvals
    console.log('7️⃣ Deleting document approvals...');
    const deletedApprovals = await prisma.document_approvals.deleteMany({});
    console.log(`   ✅ Deleted ${deletedApprovals.count} approvals`);

    // 8. Delete workflow instances
    console.log('8️⃣ Deleting workflow instances...');
    const deletedInstances = await prisma.workflow_instances.deleteMany({});
    console.log(`   ✅ Deleted ${deletedInstances.count} workflow instances`);

    // 9. Delete audit logs related to documents
    console.log('9️⃣ Deleting audit logs...');
    const deletedAuditLogs = await prisma.audit_logs.deleteMany({});
    console.log(`   ✅ Deleted ${deletedAuditLogs.count} audit logs`);

    // 10. Finally delete documents
    console.log('🔟 Deleting documents...');
    const deletedDocuments = await prisma.documents.deleteMany({});
    console.log(`   ✅ Deleted ${deletedDocuments.count} documents`);

    console.log('\n━'.repeat(60));
    console.log('\n✅ All documents and related data deleted!');
    console.log('\n📊 Summary:');
    console.log(`   Documents: ${deletedDocuments.count}`);
    console.log(`   Sign Requests: ${deletedSignRequests.count}`);
    console.log(`   Signers: ${deletedSigners.count}`);
    console.log(`   Fields: ${deletedFields.count}`);
    console.log(`   Field Values: ${deletedFieldValues.count}`);
    console.log(`   Attachments: ${deletedAttachments.count}`);
    console.log(`   CC Emails: ${deletedCCs.count}`);
    console.log(`   Approvals: ${deletedApprovals.count}`);
    console.log(`   Workflow Instances: ${deletedInstances.count}`);
    console.log(`   Audit Logs: ${deletedAuditLogs.count}`);
    console.log('\n🎉 Database is now clean and ready for testing!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllDocuments();
