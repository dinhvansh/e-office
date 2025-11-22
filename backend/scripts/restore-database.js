/**
 * Database Restore Script
 * Imports data from backup JSON file
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function restoreDatabase(backupFile) {
  console.log('🔄 Starting database restore...\n');

  try {
    // Read backup file
    const filepath = path.join(__dirname, '..', 'backups', backupFile);
    
    if (!fs.existsSync(filepath)) {
      throw new Error(`Backup file not found: ${filepath}`);
    }

    console.log(`📂 Reading backup file: ${backupFile}\n`);
    const backup = JSON.parse(fs.readFileSync(filepath, 'utf8'));

    console.log(`📅 Backup created: ${backup.metadata.timestamp}`);
    console.log(`📝 Description: ${backup.metadata.description}\n`);

    // Restore in correct order (respecting foreign keys)
    const restoreOrder = [
      'tenants',
      'departments',
      'positions',
      'users',
      'permissions',
      'roles',
      'role_permissions',
      'user_roles',
      'document_types',
      'numbering_rules',
      'external_organizations',
      'workflows',
      'workflow_steps',
      'documents',
      'workflow_instances',
      'document_approvals',
      'sign_requests',
      'signers',
      'sign_request_fields',
      'sign_request_field_values'
    ];

    for (const table of restoreOrder) {
      if (!backup.data[table] || backup.data[table].length === 0) {
        console.log(`⏭️  Skipping ${table} (no data)\n`);
        continue;
      }

      console.log(`📦 Restoring ${table}...`);
      
      try {
        // Delete existing data (optional - comment out if you want to keep existing data)
        // await prisma[table].deleteMany({});
        
        // Insert data
        for (const record of backup.data[table]) {
          await prisma[table].create({
            data: record
          });
        }
        
        console.log(`   ✅ ${backup.data[table].length} records restored\n`);
      } catch (error) {
        console.error(`   ❌ Error restoring ${table}:`, error.message);
        console.log(`   ⚠️  Continuing with next table...\n`);
      }
    }

    console.log('✅ Restore completed!\n');

    // Summary
    console.log('📊 Restore Summary:');
    console.log('─'.repeat(50));
    for (const table of restoreOrder) {
      if (backup.data[table]) {
        console.log(`   ${table.padEnd(30)} ${backup.data[table].length} records`);
      }
    }
    console.log('─'.repeat(50));

    const totalRecords = Object.values(backup.data).reduce((sum, arr) => sum + arr.length, 0);
    console.log(`   ${'TOTAL'.padEnd(30)} ${totalRecords} records\n`);

  } catch (error) {
    console.error('❌ Restore failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get backup file from command line argument
const backupFile = process.argv[2];

if (!backupFile) {
  console.error('❌ Please provide backup file name');
  console.log('\nUsage: node restore-database.js <backup-file.json>');
  console.log('Example: node restore-database.js database-backup-2025-11-23T10-30-00.json\n');
  process.exit(1);
}

// Run restore
restoreDatabase(backupFile)
  .then(() => {
    console.log('🎉 Restore process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Restore process failed:', error);
    process.exit(1);
  });
