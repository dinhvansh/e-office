/**
 * Create test users for RBAC testing
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createTestUsers() {
  console.log('🔧 Creating test users for RBAC testing...\n');
  
  try {
    const tenantId = 1; // ACME tenant
    
    // Get roles
    const userRole = await prisma.roles.findFirst({
      where: { name: 'User', tenant_id: tenantId }
    });
    
    const viewerRole = await prisma.roles.findFirst({
      where: { name: 'Viewer', tenant_id: tenantId }
    });
    
    if (!userRole || !viewerRole) {
      console.error('❌ Roles not found. Run seed-rbac.js first.');
      process.exit(1);
    }
    
    // Create regular user
    const userEmail = 'user1@acme.local';
    let user = await prisma.users.findFirst({
      where: { email: userEmail }
    });
    
    if (!user) {
      const hashedPassword = await bcrypt.hash('User123!@#', 10);
      user = await prisma.users.create({
        data: {
          email: userEmail,
          password_hash: hashedPassword,
          full_name: 'Test User',
          tenant_id: tenantId,
          status: 'active'
        }
      });
      
      // Assign User role
      await prisma.user_roles.create({
        data: {
          user_id: user.id,
          role_id: userRole.id
        }
      });
      
      console.log(`✅ Created user: ${userEmail} (password: User123!@#)`);
    } else {
      console.log(`✅ User already exists: ${userEmail}`);
    }
    
    // Create viewer user
    const viewerEmail = 'viewer1@acme.local';
    let viewer = await prisma.users.findFirst({
      where: { email: viewerEmail }
    });
    
    if (!viewer) {
      const hashedPassword = await bcrypt.hash('Viewer123!@#', 10);
      viewer = await prisma.users.create({
        data: {
          email: viewerEmail,
          password_hash: hashedPassword,
          full_name: 'Test Viewer',
          tenant_id: tenantId,
          status: 'active'
        }
      });
      
      // Assign Viewer role
      await prisma.user_roles.create({
        data: {
          user_id: viewer.id,
          role_id: viewerRole.id
        }
      });
      
      console.log(`✅ Created viewer: ${viewerEmail} (password: Viewer123!@#)`);
    } else {
      console.log(`✅ Viewer already exists: ${viewerEmail}`);
    }
    
    console.log('\n✅ Test users ready!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();
