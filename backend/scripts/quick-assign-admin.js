// Quick script to assign Admin role without Prisma client
const { Client } = require('pg');

async function assignAdmin() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://esign:esignpass@localhost:5432/esign'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Assign Admin role
    const result = await client.query(`
      INSERT INTO user_roles (user_id, role_id)
      SELECT u.id, r.id
      FROM users u, roles r
      WHERE u.email = 'admin@acme.local' 
        AND r.name = 'Admin'
        AND NOT EXISTS (
          SELECT 1 FROM user_roles ur 
          WHERE ur.user_id = u.id AND ur.role_id = r.id
        )
      RETURNING *
    `);

    if (result.rowCount > 0) {
      console.log('✅ Admin role assigned successfully!');
    } else {
      console.log('ℹ️  Admin role already assigned or user/role not found');
    }

    // Verify
    const verify = await client.query(`
      SELECT u.email, r.name as role_name
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.email = 'admin@acme.local'
    `);

    console.log('\n📋 User roles:');
    if (verify.rows.length === 0) {
      console.log('   No roles assigned yet');
    } else {
      verify.rows.forEach(row => {
        console.log(`   - ${row.email}: ${row.role_name}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

assignAdmin();
