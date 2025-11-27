/**
 * Check approvals for a specific user
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'vanqn95@gmail.com';
  
  console.log(`🔍 Checking Approvals for ${email}\n`);
  
  // Get user
  const user = await prisma.users.findUnique({
    where: { email },
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
    }
  });
  
  if (!user) {
    console.error('❌ User not found');
    return;
  }
  
  console.log(`User: ${user.full_name || user.email} (ID: ${user.id})`);
  console.log(`Tenant: ${user.tenant_id}`);
  console.log(`Roles: ${user.user_roles.map(ur => ur.role.name).join(', ')}\n`);
  
  // Check permissions
  console.log('📋 Permissions:');
  const allPermissions = user.user_roles.flatMap(ur => 
    ur.role.role_permissions.map(rp => rp.permission)
  );
  
  const approvalPerms = allPermissions.filter(p => p.resource === 'approvals');
  console.log(`  Approval permissions: ${approvalPerms.length}`);
  approvalPerms.forEach(p => {
    console.log(`    - ${p.resource}:${p.action}`);
  });
  
  if (approvalPerms.length === 0) {
    console.log('  ⚠️  No approval permissions found!');
  }
  
  // Check approvals assigned to this user
  console.log('\n📝 Approvals assigned to this user:');
  const approvals = await prisma.document_approvals.findMany({
    where: {
      approver_user_id: user.id
    },
    include: {
      document: {
        select: {
          id: true,
          title: true,
          document_number: true,
          status: true
        }
      },
      workflow_step: {
        select: {
          step_name: true,
          step_order: true
        }
      }
    },
    orderBy: {
      created_at: 'desc'
    }
  });
  
  console.log(`  Total: ${approvals.length}`);
  
  if (approvals.length === 0) {
    console.log('  ⚠️  No approvals found for this user!');
  } else {
    console.log('\n  Approvals:');
    approvals.forEach((approval, i) => {
      console.log(`\n  ${i + 1}. Document #${approval.document_id}: ${approval.document.title || 'Untitled'}`);
      console.log(`     Document Number: ${approval.document.document_number || 'N/A'}`);
      console.log(`     Document Status: ${approval.document.status}`);
      console.log(`     Step: ${approval.workflow_step?.step_name || 'N/A'} (Order: ${approval.workflow_step?.step_order || 'N/A'})`);
      console.log(`     Approval Status: ${approval.action}`);
      console.log(`     Due Date: ${approval.due_date?.toISOString() || 'N/A'}`);
      console.log(`     Created: ${approval.created_at.toISOString()}`);
    });
  }
  
  // Check if user should have approvals based on recent documents
  console.log('\n📊 Recent documents with approvals:');
  const recentDocs = await prisma.documents.findMany({
    where: {
      tenant_id: user.tenant_id,
      status: 'pending_approval'
    },
    include: {
      document_approvals: {
        include: {
          approver: {
            select: {
              id: true,
              email: true,
              full_name: true
            }
          }
        }
      }
    },
    orderBy: {
      created_at: 'desc'
    },
    take: 5
  });
  
  console.log(`  Found ${recentDocs.length} documents pending approval\n`);
  
  recentDocs.forEach((doc, i) => {
    console.log(`  ${i + 1}. Document #${doc.id}: ${doc.title || 'Untitled'}`);
    console.log(`     Approvers: ${doc.document_approvals.map(a => a.approver?.email || 'N/A').join(', ')}`);
    const userIsApprover = doc.document_approvals.some(a => a.approver_user_id === user.id);
    console.log(`     User is approver: ${userIsApprover ? '✅ YES' : '❌ NO'}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
