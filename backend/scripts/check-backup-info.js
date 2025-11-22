const fs = require('fs');
const path = require('path');

const backupFile = process.argv[2] || 'database-backup-2025-11-22T06-55-58.json';
const backupPath = path.join(__dirname, '../backups', backupFile);

console.log('📂 Reading backup file:', backupFile);
console.log('');

const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

console.log('📅 Backup Date:', backup.metadata.timestamp);
console.log('📝 Description:', backup.metadata.description);
console.log('📊 Total Records:', backup.metadata.totalRecords);
console.log('');

console.log('📋 Records by Table:');
console.log('─'.repeat(50));

Object.keys(backup.data).forEach(table => {
  const count = backup.data[table].length;
  console.log(`  ${table.padEnd(30)} ${count.toString().padStart(5)} records`);
});

console.log('─'.repeat(50));
console.log('');

// Show some sample data
console.log('👤 Sample Users:');
backup.data.users.slice(0, 3).forEach(user => {
  console.log(`  - ${user.email} (${user.full_name || 'No name'})`);
});

console.log('');
console.log('🏢 Sample Departments:');
backup.data.departments.slice(0, 5).forEach(dept => {
  console.log(`  - ${dept.name} (code: ${dept.code})`);
});
