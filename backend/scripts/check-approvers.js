const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkApprovers() {
  console.log('🔍 Checking users with approval permissions\n');

  try {
    // Get all users with their roles
    const users = await prisma.users.findMany({
      where: {
        status: 'active'
      },
      include: {
        user_roles: {
          include: {
            role: {
              include: {
                role_permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      },
      take: 10
    });

    console.log(`Found ${users.length} active users\n`);

    for (const user of users) {
      console.log(`👤 ${user.email}`);
      console.log(`   Name: ${user.full_name || 'N/A'}`);
      console.log(`   ID: ${user.id}`);
      
      if (user.user_roles.length > 0) {
        console.log(`   Roles:`);
        for (const ur of user.user_roles) {
          console.log(`     - ${ur.role.name}`);
          
          const approvalPerms = ur.role.role_permissions.filter(rp => 
            rp.permission && rp.permission.code && rp.permission.code.startsWith('approvals:')
          );
          
          if (approvalPerms.length > 0) {
            console.log(`       Approval permissions:`);
            approvalPerms.forEach(rp => {
              console.log(`         ✓ ${rp.permission.code}`);
            });
          }
        }
      } else {
        console.log(`   Roles: None`);
      }
      console.log('');
    }

    // Check pending approvals
    console.log('\n📋 Checking pending approvals in database...');
    const pendingApprovals = await prisma.document_approvals.findMany({
      where: {
        action: 'pending'
      },
      include: {
        document: {
          select: {
            title: true,
            tenant_id: true
          }
        },
        approver: {
          select: {
            email: true,
            full_name: true
          }
        }
      },
      take: 10
    });

    console.log(`Found ${pendingApprovals.length} pending approvals\n`);
    
    if (pendingApprovals.length > 0) {
      console.log('First 5 pending approvals:');
      pendingApprovals.slice(0, 5).forEach((approval, idx) => {
        console.log(`\n${idx + 1}. Approval ID: ${approval.id}`);
        console.log(`   Document: ${approval.document?.title || 'N/A'}`);
        console.log(`   Approver: ${approval.approver?.email || 'N/A'} (${approval.approver?.full_name || 'N/A'})`);
        console.log(`   Approver User ID: ${approval.approver_user_id}`);
        console.log(`   Due date: ${approval.due_date || 'N/A'}`);
      });
    }

    await prisma.$disconnect();
    console.log('\n✅ Check completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkApprovers();
