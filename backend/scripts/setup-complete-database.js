/**
 * Complete Database Setup Script
 * Run this to setup everything from scratch
 */

const { execSync } = require('child_process');

console.log('🚀 Starting Complete Database Setup...\n');

const scripts = [
  { name: 'Basic Seed (Users, Roles, Permissions, Departments)', file: 'seed.js' },
  { name: 'Positions (12 job titles)', file: 'seed-positions.js' },
  { name: 'Positions Permissions', file: 'seed-positions-permissions.js' },
  { name: 'External Organizations (5 orgs)', file: 'seed-external-orgs.js' },
  { name: 'Workflows (3 sample workflows)', file: 'seed-workflows.js' },
  { name: 'Assign Admin Role', file: 'assign-admin-to-acme-local.js' },
];

let successCount = 0;
let failCount = 0;

for (const script of scripts) {
  try {
    console.log(`\n📝 Running: ${script.name}`);
    console.log(`   File: ${script.file}`);
    
    execSync(`node scripts/${script.file}`, {
      cwd: __dirname + '/..',
      stdio: 'inherit',
    });
    
    successCount++;
    console.log(`✅ Success: ${script.name}\n`);
  } catch (error) {
    failCount++;
    console.error(`❌ Failed: ${script.name}`);
    console.error(`   Error: ${error.message}\n`);
  }
}

console.log('\n' + '='.repeat(60));
console.log('📊 Setup Summary:');
console.log(`   ✅ Success: ${successCount}/${scripts.length}`);
console.log(`   ❌ Failed: ${failCount}/${scripts.length}`);
console.log('='.repeat(60));

if (failCount === 0) {
  console.log('\n🎉 Database setup complete!');
  console.log('\n📋 What was created:');
  console.log('   - 1 Admin user (admin@acme.local / password123)');
  console.log('   - 4 Roles (Admin, Manager, User, Viewer)');
  console.log('   - 39 Permissions');
  console.log('   - 3 Departments');
  console.log('   - 12 Positions (CEO, Manager, Staff, etc.)');
  console.log('   - 5 External Organizations');
  console.log('   - 3 Workflows (Simple, 2-Level, Contract)');
  console.log('   - 8 Document Types');
  console.log('\n🔐 Login with:');
  console.log('   Email: admin@acme.local');
  console.log('   Password: password123');
} else {
  console.log('\n⚠️  Some scripts failed. Check errors above.');
  console.log('   You may need to run failed scripts manually.');
}

console.log('\n');
