// Quick script to check database data
const { Client } = require('pg');

async function checkData() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://esign:esignpass@localhost:5432/esign'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check roles
    const roles = await client.query('SELECT id, name, description, is_system, tenant_id FROM roles ORDER BY id');
    console.log('📋 ROLES:', roles.rows.length, 'rows');
    roles.rows.forEach(r => {
      console.log(`  - [${r.id}] ${r.name} (tenant: ${r.tenant_id}, system: ${r.is_system})`);
    });

    // Check departments
    const depts = await client.query('SELECT id, name, description, tenant_id FROM departments ORDER BY id');
    console.log('\n📋 DEPARTMENTS:', depts.rows.length, 'rows');
    depts.rows.forEach(d => {
      console.log(`  - [${d.id}] ${d.name} (tenant: ${d.tenant_id})`);
    });

    // Check external orgs
    const orgs = await client.query('SELECT id, name, code, category, tenant_id FROM external_organizations ORDER BY id');
    console.log('\n📋 EXTERNAL ORGS:', orgs.rows.length, 'rows');
    orgs.rows.forEach(o => {
      console.log(`  - [${o.id}] ${o.name} - ${o.code} (${o.category}, tenant: ${o.tenant_id})`);
    });

    // Check current user's tenant
    const user = await client.query("SELECT id, email, tenant_id FROM users WHERE email = 'admin@acme.local'");
    if (user.rows.length > 0) {
      console.log('\n👤 CURRENT USER:');
      console.log(`  - Email: ${user.rows[0].email}`);
      console.log(`  - Tenant ID: ${user.rows[0].tenant_id}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkData();
