/**
 * Database Backup Script
 * Exports all data to a single JSON file for easy migration
 * 
 * Usage: node scripts/backup-database.js (from backend directory)
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function backupDatabase() {
  console.log('🔄 Starting database backup...\n');

  try {
    const backup = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        description: 'E-Office System Database Backup'
      },
      data: {}
    };

    // 1. Tenants
    console.log('📦 Backing up tenants...');
    backup.data.tenants = await prisma.tenants.findMany();
    console.log(`   ✅ ${backup.data.tenants.length} tenants\n`);

    // 2. Departments
    console.log('📦 Backing up departments...');
    backup.data.departments = await prisma.departments.findMany();
    console.log(`   ✅ ${backup.data.departments.length} departments\n`);

    // 3. Positions
    console.log('📦 Backing up positions...');
    backup.data.positions = await prisma.positions.findMany();
    console.log(`   ✅ ${backup.data.positions.length} positions\n`);

    // 4. Users
    console.log('📦 Backing up users...');
    backup.data.users = await prisma.users.findMany();
    console.log(`   ✅ ${backup.data.users.length} users\n`);

    // 5. Permissions
    console.log('📦 Backing up permissions...');
    backup.data.permissions = await prisma.permissions.findMany();
    console.log(`   ✅ ${backup.data.permissions.length} permissions\n`);

    // 6. Roles
    console.log('📦 Backing up roles...');
    backup.data.roles = await prisma.roles.findMany();
    console.log(`   ✅ ${backup.data.roles.length} roles\n`);

    // 7. Role Permissions
    console.log('📦 Backing up role_permissions...');
    backup.data.role_permissions = await prisma.role_permissions.findMany();
    console.log(`   ✅ ${backup.data.role_permissions.length} role_permissions\n`);

    // 8. User Roles
    console.log('📦 Backing up user_roles...');
    backup.data.user_roles = await prisma.user_roles.findMany();
    console.log(`   ✅ ${backup.data.user_roles.length} user_roles\n`);

    // 9. Document Types
    console.log('📦 Backing up document_types...');
    backup.data.document_types = await prisma.document_types.findMany();
    console.log(`   ✅ ${backup.data.document_types.length} document_types\n`);

    // 10. Numbering Rules
    console.log('📦 Backing up numbering_rules...');
    backup.data.numbering_rules = await prisma.numbering_rules.findMany();
    console.log(`   ✅ ${backup.data.numbering_rules.length} numbering_rules\n`);

    // 11. External Organizations
    console.log('📦 Backing up external_organizations...');
    backup.data.external_organizations = await prisma.external_organizations.findMany();
    console.log(`   ✅ ${backup.data.external_organizations.length} external_organizations\n`);

    // 12. Workflows
    console.log('📦 Backing up workflows...');
    backup.data.workflows = await prisma.workflows.findMany();
    console.log(`   ✅ ${backup.data.workflows.length} workflows\n`);

    // 13. Workflow Steps
    console.log('📦 Backing up workflow_steps...');
    backup.data.workflow_steps = await prisma.workflow_steps.findMany();
    console.log(`   ✅ ${backup.data.workflow_steps.length} workflow_steps\n`);

    // 14. Documents (without file content)
    console.log('📦 Backing up documents...');
    backup.data.documents = await prisma.documents.findMany();
    console.log(`   ✅ ${backup.data.documents.length} documents\n`);

    // 15. Workflow Instances
    console.log('📦 Backing up workflow_instances...');
    backup.data.workflow_instances = await prisma.workflow_instances.findMany();
    console.log(`   ✅ ${backup.data.workflow_instances.length} workflow_instances\n`);

    // 16. Document Approvals
    console.log('📦 Backing up document_approvals...');
    backup.data.document_approvals = await prisma.document_approvals.findMany();
    console.log(`   ✅ ${backup.data.document_approvals.length} document_approvals\n`);

    // 17. Sign Requests
    console.log('📦 Backing up sign_requests...');
    backup.data.sign_requests = await prisma.sign_requests.findMany();
    console.log(`   ✅ ${backup.data.sign_requests.length} sign_requests\n`);

    // 18. Signers
    console.log('📦 Backing up signers...');
    backup.data.signers = await prisma.signers.findMany();
    console.log(`   ✅ ${backup.data.signers.length} signers\n`);

    // 19. Sign Request Fields
    console.log('📦 Backing up sign_request_fields...');
    backup.data.sign_request_fields = await prisma.sign_request_fields.findMany();
    console.log(`   ✅ ${backup.data.sign_request_fields.length} sign_request_fields\n`);

    // 20. Sign Request Field Values
    console.log('📦 Backing up sign_request_field_values...');
    backup.data.sign_request_field_values = await prisma.sign_request_field_values.findMany();
    console.log(`   ✅ ${backup.data.sign_request_field_values.length} sign_request_field_values\n`);

    // Save to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `database-backup-${timestamp}.json`;
    const filepath = path.join(__dirname, '..', 'backups', filename);

    // Create backups directory if not exists
    const backupsDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));

    console.log('✅ Backup completed successfully!\n');
    console.log(`📁 File: ${filename}`);
    console.log(`📍 Location: ${filepath}`);
    console.log(`📊 Size: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB\n`);

    // Summary
    console.log('📊 Backup Summary:');
    console.log('─'.repeat(50));
    Object.keys(backup.data).forEach(table => {
      console.log(`   ${table.padEnd(30)} ${backup.data[table].length} records`);
    });
    console.log('─'.repeat(50));

    const totalRecords = Object.values(backup.data).reduce((sum, arr) => sum + arr.length, 0);
    console.log(`   ${'TOTAL'.padEnd(30)} ${totalRecords} records\n`);

  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run backup
backupDatabase()
  .then(() => {
    console.log('🎉 Backup process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Backup process failed:', error);
    process.exit(1);
  });
