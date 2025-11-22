const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Define restore order (respecting foreign keys)
const RESTORE_ORDER = [
  'tenants',
  'permissions',
  'roles',
  'role_permissions',
  'positions',
  'departments',  // Can have self-reference (parent_id)
  'users',        // Depends on: departments, positions
  'user_roles',   // Depends on: users, roles
  'external_organizations',
  'workflows',
  'workflow_steps',
  'document_types',
  'numbering_rules',
  'documents',    // Depends on: users, document_types, departments
  'workflow_instances',
  'document_approvals',
  'sign_requests',
  'signers',
  'sign_request_fields',
  'sign_request_field_values',
];

async function restoreDatabase(backupFileName) {
  console.log('🔄 Starting SMART database restore...\n');

  const backupPath = path.join(__dirname, '../backups', backupFileName);
  
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }

  console.log('📂 Reading backup file:', backupFileName);
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

  console.log('\n📅 Backup created:', backup.metadata.timestamp);
  console.log('📝 Description:', backup.metadata.description);
  console.log('');

  // Step 1: Clear existing data (in reverse order)
  console.log('🗑️  Clearing existing data...\n');
  
  for (const table of [...RESTORE_ORDER].reverse()) {
    if (backup.data[table] && backup.data[table].length > 0) {
      try {
        const count = await prisma[table].deleteMany({});
        console.log(`   ✅ Cleared ${table}: ${count.count} records`);
      } catch (err) {
        console.log(`   ⚠️  Skip ${table}: ${err.message}`);
      }
    }
  }

  console.log('\n📦 Restoring data in correct order...\n');

  let successCount = 0;
  let errorCount = 0;
  const summary = {};
  
  // Store records for post-processing
  const deferredUpdates = {
    departments: [], // manager_id updates
  };

  // Step 2: Restore data in correct order
  for (const table of RESTORE_ORDER) {
    const records = backup.data[table];
    
    if (!records || records.length === 0) {
      console.log(`⏭️  Skipping ${table} (no data)`);
      summary[table] = 0;
      continue;
    }

    console.log(`📦 Restoring ${table}...`);
    
    try {
      let restored = 0;
      
      // Special handling for departments (self-reference + manager_id)
      if (table === 'departments') {
        // First pass: Create all departments without parent_id and manager_id
        for (const record of records) {
          const { parent_id, manager_id, ...recordWithoutRefs } = record;
          await prisma[table].create({ data: recordWithoutRefs });
          restored++;
        }
        
        // Second pass: Update parent_id (after all departments exist)
        for (const record of records) {
          if (record.parent_id) {
            await prisma[table].update({
              where: { id: record.id },
              data: { parent_id: record.parent_id }
            }).catch(() => {}); // Ignore if parent doesn't exist
          }
        }
        
        // Store for later update (after users exist)
        deferredUpdates.departments = records.filter(r => r.manager_id);
      } 
      // Special handling for users (manager_id self-reference)
      else if (table === 'users') {
        // First pass: Create all users without manager_id
        for (const record of records) {
          const { manager_id, ...recordWithoutManager } = record;
          await prisma[table].create({ data: recordWithoutManager });
          restored++;
        }
        
        // Second pass: Update manager_id
        for (const record of records) {
          if (record.manager_id) {
            await prisma[table].update({
              where: { id: record.id },
              data: { manager_id: record.manager_id }
            }).catch(() => {}); // Ignore if manager doesn't exist
          }
        }
        
        // Third pass: Update departments.manager_id (now that users exist)
        console.log('   🔄 Updating department managers...');
        for (const dept of deferredUpdates.departments) {
          if (dept.manager_id) {
            await prisma.departments.update({
              where: { id: dept.id },
              data: { manager_id: dept.manager_id }
            }).catch(() => {}); // Ignore if user doesn't exist
          }
        }
      }
      // Normal tables
      else {
        for (const record of records) {
          await prisma[table].create({ data: record });
          restored++;
        }
      }
      
      console.log(`   ✅ ${restored} records restored`);
      summary[table] = restored;
      successCount++;
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      console.log(`   ⚠️  Continuing with next table...`);
      summary[table] = `Error: ${err.message}`;
      errorCount++;
    }
    
    console.log('');
  }

  // Summary
  console.log('✅ Restore completed!\n');
  console.log('📊 Restore Summary:');
  console.log('─'.repeat(50));
  
  for (const [table, count] of Object.entries(summary)) {
    const countStr = typeof count === 'number' ? `${count} records` : count;
    console.log(`   ${table.padEnd(30)} ${countStr}`);
  }
  
  console.log('─'.repeat(50));
  console.log(`   TOTAL                          ${Object.values(summary).filter(v => typeof v === 'number').reduce((a, b) => a + b, 0)} records`);
  console.log('');
  
  console.log(`✅ Success: ${successCount}/${RESTORE_ORDER.length} tables`);
  console.log(`❌ Errors: ${errorCount}/${RESTORE_ORDER.length} tables`);
  console.log('');
  
  // Step 3: Fix sequences
  console.log('🔧 Fixing database sequences...\n');
  
  for (const table of RESTORE_ORDER) {
    try {
      const result = await prisma.$queryRawUnsafe(
        `SELECT MAX(id) as max_id FROM ${table}`
      );
      
      const maxId = result[0]?.max_id || 0;
      
      if (maxId > 0) {
        await prisma.$executeRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('${table}', 'id'), ${maxId}, true)`
        );
        console.log(`   ✅ ${table.padEnd(30)} → next ID: ${maxId + 1}`);
      }
    } catch (err) {
      // Skip tables without id column (junction tables)
      if (!err.message.includes('column "id" does not exist')) {
        console.log(`   ⚠️  ${table}: ${err.message}`);
      }
    }
  }
  
  console.log('');
  console.log('🎉 Restore process completed!');
  console.log('✅ All sequences fixed and ready for new records!');

  await prisma.$disconnect();
}

// Run
const backupFile = process.argv[2] || 'database-backup-2025-11-22T06-55-58.json';
restoreDatabase(backupFile).catch(err => {
  console.error('💥 Restore failed:', err);
  process.exit(1);
});
