const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function compareData() {
  console.log('🔍 Comparing Backup vs Current Database\n');

  // Read backup
  const backupFile = 'database-backup-2025-11-22T06-55-58.json';
  const backupPath = path.join(__dirname, '../backups', backupFile);
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

  console.log('📅 Backup Date:', backup.metadata.timestamp);
  console.log('');

  // Compare tables
  const tables = [
    { name: 'tenants', prisma: 'tenants' },
    { name: 'departments', prisma: 'departments' },
    { name: 'positions', prisma: 'positions' },
    { name: 'users', prisma: 'users' },
    { name: 'roles', prisma: 'roles' },
    { name: 'permissions', prisma: 'permissions' },
    { name: 'external_organizations', prisma: 'external_organizations' },
    { name: 'workflows', prisma: 'workflows' },
    { name: 'documents', prisma: 'documents' },
  ];

  console.log('📊 Comparison:');
  console.log('─'.repeat(70));
  console.log('Table'.padEnd(30) + 'Backup'.padStart(10) + 'Current'.padStart(10) + 'Status'.padStart(20));
  console.log('─'.repeat(70));

  for (const table of tables) {
    const backupCount = backup.data[table.name]?.length || 0;
    const currentCount = await prisma[table.prisma].count();
    
    const diff = currentCount - backupCount;
    let status = '✅ Same';
    if (diff > 0) status = `⚠️  +${diff} more`;
    if (diff < 0) status = `❌ ${diff} less`;

    console.log(
      table.name.padEnd(30) +
      backupCount.toString().padStart(10) +
      currentCount.toString().padStart(10) +
      status.padStart(20)
    );
  }

  console.log('─'.repeat(70));
  console.log('');

  // Check specific data
  console.log('🔍 Detailed Comparison:\n');

  // Departments
  const backupDepts = backup.data.departments.map(d => d.name).sort();
  const currentDepts = (await prisma.departments.findMany()).map(d => d.name).sort();
  
  console.log('🏢 Departments:');
  console.log('  Backup has:', backupDepts.length);
  console.log('  Current has:', currentDepts.length);
  
  const missingDepts = backupDepts.filter(d => !currentDepts.includes(d));
  const extraDepts = currentDepts.filter(d => !backupDepts.includes(d));
  
  if (missingDepts.length > 0) {
    console.log('  ❌ Missing from current:', missingDepts.slice(0, 5).join(', '));
  }
  if (extraDepts.length > 0) {
    console.log('  ✅ Extra in current:', extraDepts.slice(0, 5).join(', '));
  }
  console.log('');

  // Users
  const backupUsers = backup.data.users.map(u => u.email).sort();
  const currentUsers = (await prisma.users.findMany()).map(u => u.email).sort();
  
  console.log('👤 Users:');
  console.log('  Backup has:', backupUsers.length);
  console.log('  Current has:', currentUsers.length);
  
  const missingUsers = backupUsers.filter(u => !currentUsers.includes(u));
  const extraUsers = currentUsers.filter(u => !backupUsers.includes(u));
  
  if (missingUsers.length > 0) {
    console.log('  ❌ Missing from current:', missingUsers.slice(0, 5).join(', '));
  }
  if (extraUsers.length > 0) {
    console.log('  ✅ Extra in current:', extraUsers.slice(0, 5).join(', '));
  }
  console.log('');

  // Documents
  console.log('📄 Documents:');
  console.log('  Backup has:', backup.data.documents.length);
  const currentDocs = await prisma.documents.count();
  console.log('  Current has:', currentDocs);
  console.log('');

  // Conclusion
  console.log('📝 Conclusion:');
  if (currentDepts.length < backupDepts.length || currentUsers.length < backupUsers.length) {
    console.log('  ⚠️  Current database has LESS data than backup');
    console.log('  💡 Recommendation: Restore from backup or re-seed');
  } else if (currentDepts.length === backupDepts.length && currentUsers.length === backupUsers.length) {
    console.log('  ✅ Current database matches backup (same count)');
  } else {
    console.log('  ℹ️  Current database has DIFFERENT data than backup');
    console.log('  💡 This is normal if you ran seed scripts instead of restore');
  }

  await prisma.$disconnect();
}

compareData().catch(console.error);
