const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/wpsign'
    }
  }
});

async function checkSigningFlow() {
  try {
    // Find the most recent document
    const document = await prisma.documents.findFirst({
      orderBy: {
        created_at: 'desc'
      },
      include: {
        sign_request: {
          include: {
            signers: {
              orderBy: {
                signing_order: 'asc'
              },
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    full_name: true
                  }
                }
              }
            }
          }
        },
        document_type: {
          select: {
            id: true,
            name: true,
            code: true,
            require_digital_signing: true,
            require_approval: true,
            default_workflow_id: true
          }
        },
        workflow_instance: {
          include: {
            workflow: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        approvals: {
          orderBy: {
            id: 'asc'
          },
          include: {
            approver: {
              select: {
                id: true,
                email: true,
                full_name: true
              }
            },
            workflow_step: {
              select: {
                id: true,
                step_name: true,
                step_order: true
              }
            }
          }
        }
      }
    });

    if (!document) {
      console.log('❌ Không tìm thấy document');
      return;
    }

    console.log('\n📄 DOCUMENT INFO:');
    console.log('ID:', document.id);
    console.log('File path:', document.file_path);
    console.log('Original file name:', document.original_file_name);
    console.log('Document number:', document.document_number);
    console.log('Status:', document.status);
    console.log('Created at:', document.created_at);
    
    console.log('\n📋 DOCUMENT TYPE:');
    console.log('Name:', document.document_type?.name);
    console.log('Code:', document.document_type?.code);
    console.log('Require digital signing:', document.document_type?.require_digital_signing);
    console.log('Require approval:', document.document_type?.require_approval);
    console.log('Default workflow ID:', document.document_type?.default_workflow_id);
    
    // Check workflow instance
    if (document.workflow_instance) {
      console.log('\n🔄 WORKFLOW INSTANCE:');
      console.log('ID:', document.workflow_instance.id);
      console.log('Workflow:', document.workflow_instance.workflow?.name);
      console.log('Status:', document.workflow_instance.status);
      console.log('Current step:', document.workflow_instance.current_step);
    } else {
      console.log('\n❌ Không có workflow instance');
    }
    
    // Check approvals
    if (document.approvals && document.approvals.length > 0) {
      console.log('\n✅ APPROVALS (Người phê duyệt):');
      console.log('Total approvers:', document.approvals.length);
      
      document.approvals.forEach((approval, index) => {
        console.log(`\n${index + 1}. Approver #${approval.workflow_step?.step_order || index + 1}:`);
        console.log('   ID:', approval.id);
        console.log('   Step name:', approval.workflow_step?.step_name || 'N/A');
        console.log('   Action:', approval.action);
        console.log('   Acted at:', approval.acted_at || 'Chưa phê duyệt');
        
        if (approval.approver) {
          console.log('   👤 Approver:');
          console.log('      User ID:', approval.approver.id);
          console.log('      Full name:', approval.approver.full_name);
          console.log('      Email:', approval.approver.email);
        }
      });
    } else {
      console.log('\n❌ Không có approvals (người phê duyệt)');
    }

    if (document.sign_request) {
      console.log('\n✍️ SIGN REQUEST:');
      console.log('ID:', document.sign_request.id);
      console.log('Status:', document.sign_request.status);
      console.log('Total signers:', document.sign_request.signers.length);
      
      console.log('\n👥 SIGNERS (Luồng ký):');
      document.sign_request.signers.forEach((signer, index) => {
        console.log(`\n${index + 1}. Signer #${signer.signing_order}:`);
        console.log('   ID:', signer.id);
        console.log('   Is Internal:', signer.is_internal);
        console.log('   User ID:', signer.user_id || 'N/A');
        console.log('   Email:', signer.email);
        console.log('   Name:', signer.name);
        console.log('   Status:', signer.status);
        console.log('   Signed at:', signer.signed_at || 'Chưa ký');
        
        if (signer.user) {
          console.log('   👤 Internal User:');
          console.log('      User ID:', signer.user.id);
          console.log('      Full name:', signer.user.full_name);
          console.log('      Email:', signer.user.email);
        }
        
        if (signer.is_internal) {
          console.log('   ✅ Is Internal Signer');
        } else {
          console.log('   🌐 Is External Signer');
        }
      });
      
      // Check signing order
      console.log('\n🔢 SIGNING ORDER VALIDATION:');
      const orders = document.sign_request.signers.map(s => s.signing_order);
      const uniqueOrders = [...new Set(orders)];
      const expectedOrders = Array.from({ length: orders.length }, (_, i) => i + 1);
      
      console.log('Current orders:', orders);
      console.log('Expected orders:', expectedOrders);
      console.log('Has duplicates:', orders.length !== uniqueOrders.length);
      console.log('Is sequential:', JSON.stringify(orders.sort()) === JSON.stringify(expectedOrders));
      
    } else {
      console.log('\n❌ Không có sign request');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSigningFlow();
