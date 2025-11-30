const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestNotifications() {
  try {
    console.log('🔍 Finding test user...');
    
    // Find admin user
    const user = await prisma.users.findFirst({
      where: { 
        OR: [
          { email: 'admin@example.com' },
          { email: 'admin@acme.local' }
        ]
      },
      include: { tenant: true }
    });

    if (!user) {
      console.error('❌ User not found. Please create an admin user first.');
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.email} (ID: ${user.id}, Tenant: ${user.tenant_id})`);

    // Create test notifications
    const notifications = [
      {
        tenant_id: user.tenant_id,
        user_id: user.id,
        type: 'approval_request',
        title: 'Yêu cầu phê duyệt mới',
        message: 'Tài liệu "Hợp đồng thuê văn phòng 2025" cần phê duyệt của bạn',
        link: '/approvals?filter=pending',
      },
      {
        tenant_id: user.tenant_id,
        user_id: user.id,
        type: 'sign_request',
        title: 'Yêu cầu ký mới',
        message: 'Bạn có yêu cầu ký cho tài liệu "Thỏa thuận bảo mật"',
        link: '/sign-requests/1/internal-sign',
      },
      {
        tenant_id: user.tenant_id,
        user_id: user.id,
        type: 'approval_approved',
        title: 'Phê duyệt thành công',
        message: 'Tài liệu "Đơn xin nghỉ phép" đã được phê duyệt',
        link: '/documents/1/flow',
      },
      {
        tenant_id: user.tenant_id,
        user_id: user.id,
        type: 'workflow_completed',
        title: 'Quy trình hoàn tất',
        message: 'Tài liệu "Báo cáo tháng 11" đã hoàn tất quy trình phê duyệt',
        link: '/documents/2',
      },
      {
        tenant_id: user.tenant_id,
        user_id: user.id,
        type: 'approval_info_requested',
        title: 'Yêu cầu bổ sung thông tin',
        message: 'Nguyễn Văn A yêu cầu bổ sung thông tin cho tài liệu "Đề xuất dự án"',
        link: '/documents/3/flow',
      },
    ];

    console.log('\n📝 Creating test notifications...');
    
    for (const notification of notifications) {
      const created = await prisma.notifications.create({
        data: notification
      });
      console.log(`✅ Created: ${created.title} (ID: ${created.id})`);
    }

    console.log('\n✅ All test notifications created successfully!');
    console.log('\n📊 Summary:');
    console.log(`   User: ${user.email}`);
    console.log(`   Tenant: ${user.tenant_id}`);
    console.log(`   Notifications: ${notifications.length}`);
    console.log('\n💡 Run: node scripts/test-notifications.js to test the API');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestNotifications();
