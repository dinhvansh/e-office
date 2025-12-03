const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNewTenant() {
  console.log('🔍 Checking tenants and recent registrations...\n');

  try {
    // Get all tenants
    const tenants = await prisma.tenants.findMany({
      orderBy: { created_at: 'desc' },
      take: 10
    });

    console.log('📊 Recent Tenants:');
    console.log('─'.repeat(80));
    tenants.forEach((tenant, index) => {
      console.log(`${index + 1}. ID: ${tenant.id}`);
      console.log(`   Name: ${tenant.name}`);
      console.log(`   Domain: ${tenant.domain || 'N/A'}`);
      console.log(`   Status: ${tenant.status}`);
      console.log(`   Created: ${tenant.created_at.toLocaleString('vi-VN')}`);
      console.log('');
    });

    // Get recent users (last 10)
    const recentUsers = await prisma.users.findMany({
      orderBy: { created_at: 'desc' },
      take: 10,
      include: {
        tenant: true
      }
    });

    console.log('\n👥 Recent User Registrations:');
    console.log('─'.repeat(80));
    recentUsers.forEach((user, index) => {
      const statusEmoji = {
        'pending': '⏳',
        'active': '✅',
        'rejected': '❌',
        'inactive': '⚪'
      }[user.status] || '❓';

      console.log(`${index + 1}. ${statusEmoji} ${user.full_name || user.email}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Tenant: ${user.tenant?.name || 'Unknown'} (ID: ${user.tenant_id})`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Created: ${user.created_at.toLocaleString('vi-VN')}`);
      console.log('');
    });

    // Get pending users
    const pendingUsers = await prisma.users.findMany({
      where: { status: 'pending' },
      include: {
        tenant: true
      },
      orderBy: { created_at: 'desc' }
    });

    if (pendingUsers.length > 0) {
      console.log('\n⏳ Pending Users (Waiting for Approval):');
      console.log('─'.repeat(80));
      pendingUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.full_name || user.email}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Tenant: ${user.tenant?.name || 'Unknown'} (ID: ${user.tenant_id})`);
        console.log(`   Registered: ${user.created_at.toLocaleString('vi-VN')}`);
        console.log('');
      });

      console.log('💡 To approve users, admin should:');
      console.log('   1. Login at: http://localhost:3000/login');
      console.log('   2. Go to: http://localhost:3000/users');
      console.log('   3. Filter by "Chờ duyệt" or find pending users');
      console.log('   4. Click "Phê duyệt" button');
    } else {
      console.log('\n✅ No pending users at the moment.');
    }

    // Summary
    console.log('\n📈 Summary:');
    console.log('─'.repeat(80));
    console.log(`Total Tenants: ${tenants.length}`);
    console.log(`Total Users: ${recentUsers.length}`);
    console.log(`Pending Approvals: ${pendingUsers.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkNewTenant();
