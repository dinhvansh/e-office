const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkApprovers() {
  console.log('🔍 Tìm người phê duyệt cho văn bản 024/2025...\n');

  try {
    // Find document
    const document = await prisma.documents.findFirst({
      where: {
        document_number: {
          contains: '024/2025'
        }
      },
      include: {
        owner: true,
        department: true,
        workflow_instance: {
          include: {
            workflow: {
              include: {
                steps: {
                  orderBy: {
                    step_order: 'asc'
                  }
                }
              }
            },
            current_step: true
          }
        }
      }
    });

    if (!document) {
      console.log('❌ Không tìm thấy văn bản 024/2025');
      return;
    }

    console.log('📄 VĂN BẢN');
    console.log('═══════════════════════════════════════');
    console.log(`Số: ${document.document_number}`);
    console.log(`Tiêu đề: ${document.title}`);
    console.log(`Người tạo: ${document.owner?.full_name || 'N/A'} (${document.owner?.email || 'N/A'})`);
    console.log(`Phòng ban: ${document.department?.name || 'Không có'}`);

    if (!document.workflow_instance) {
      console.log('\n❌ Văn bản không có workflow');
      return;
    }

    console.log('\n🔄 WORKFLOW');
    console.log('═══════════════════════════════════════');
    console.log(`Tên: ${document.workflow_instance.workflow.name}`);
    console.log(`Trạng thái: ${document.workflow_instance.status}`);
    console.log(`Bước hiện tại: ${document.workflow_instance.current_step?.step_name || 'N/A'}`);

    console.log('\n👥 DANH SÁCH NGƯỜI PHÊ DUYỆT THEO TỪNG BƯỚC');
    console.log('═══════════════════════════════════════');

    const steps = document.workflow_instance.workflow.steps;

    for (const step of steps) {
      console.log(`\n📌 Bước ${step.step_order}: ${step.step_name}`);
      console.log(`   Loại: ${step.approver_type}`);
      console.log(`   Vai trò: ${step.participant_role || 'N/A'}`);
      console.log(`   Bắt buộc: ${step.is_required ? 'Có' : 'Không'}`);
      console.log(`   Song song: ${step.is_parallel ? 'Có' : 'Không'}`);

      // Find approvers based on type
      let approvers = [];

      if (step.approver_type === 'user' && step.approver_id) {
        // Specific user
        const user = await prisma.users.findUnique({
          where: { id: step.approver_id },
          include: {
            department: true,
            position: true
          }
        });
        if (user) {
          approvers.push({
            id: user.id,
            name: user.full_name,
            email: user.email,
            department: user.department?.name,
            position: user.position?.name
          });
        }
      } else if (step.approver_type === 'role' && step.approver_id) {
        // Users with specific role
        const role = await prisma.roles.findUnique({
          where: { id: step.approver_id },
          include: {
            user_roles: {
              include: {
                user: {
                  include: {
                    department: true,
                    position: true
                  }
                }
              }
            }
          }
        });
        if (role) {
          console.log(`   Role: ${role.name}`);
          approvers = role.user_roles.map(ur => ({
            id: ur.user.id,
            name: ur.user.full_name,
            email: ur.user.email,
            department: ur.user.department?.name,
            position: ur.user.position?.name
          }));
        }
      } else if (step.approver_type === 'department' && step.approver_id) {
        // Department manager or all users in department
        const department = await prisma.departments.findUnique({
          where: { id: step.approver_id },
          include: {
            manager: {
              include: {
                department: true,
                position: true
              }
            },
            users: {
              include: {
                department: true,
                position: true
              }
            }
          }
        });
        if (department) {
          console.log(`   Phòng ban: ${department.name}`);
          if (department.manager) {
            approvers.push({
              id: department.manager.id,
              name: department.manager.full_name,
              email: department.manager.email,
              department: department.manager.department?.name,
              position: department.manager.position?.name,
              role: 'Trưởng phòng'
            });
          }
          // Also show all users in department
          console.log(`   Tất cả nhân viên trong phòng ban (${department.users.length} người):`);
          department.users.forEach(user => {
            console.log(`     - ${user.full_name} (${user.email})`);
          });
        }
      } else if (step.approver_type === 'manager') {
        // Document owner's manager
        if (document.owner?.manager_id) {
          const manager = await prisma.users.findUnique({
            where: { id: document.owner.manager_id },
            include: {
              department: true,
              position: true
            }
          });
          if (manager) {
            approvers.push({
              id: manager.id,
              name: manager.full_name,
              email: manager.email,
              department: manager.department?.name,
              position: manager.position?.name,
              role: 'Quản lý trực tiếp'
            });
          }
        } else {
          console.log(`   ⚠️ Người tạo văn bản chưa có quản lý trực tiếp`);
        }
      }

      // Display approvers
      if (approvers.length > 0) {
        console.log(`\n   ✅ Người phê duyệt (${approvers.length}):`);
        approvers.forEach((approver, index) => {
          console.log(`   ${index + 1}. ${approver.name} (${approver.email})`);
          if (approver.position) console.log(`      Chức danh: ${approver.position}`);
          if (approver.department) console.log(`      Phòng ban: ${approver.department}`);
          if (approver.role) console.log(`      Vai trò: ${approver.role}`);
        });
      } else {
        console.log(`   ❌ Không tìm thấy người phê duyệt`);
      }

      // Check if this is current step
      if (document.workflow_instance.current_step_id === step.id) {
        console.log(`\n   🔔 ĐÂY LÀ BƯỚC HIỆN TẠI - Đang chờ phê duyệt`);
      }
    }

    // Check actual approvals created
    console.log('\n📋 PHIẾU PHÊ DUYỆT ĐÃ TẠO');
    console.log('═══════════════════════════════════════');
    
    const approvals = await prisma.document_approvals.findMany({
      where: {
        document_id: document.id
      },
      include: {
        approver: {
          include: {
            department: true,
            position: true
          }
        },
        workflow_step: true
      },
      orderBy: {
        created_at: 'asc'
      }
    });

    if (approvals.length === 0) {
      console.log('❌ Chưa có phiếu phê duyệt nào được tạo');
      console.log('\n💡 Lý do có thể:');
      console.log('  - Workflow chưa được kích hoạt');
      console.log('  - Hệ thống chưa tạo approval records');
      console.log('  - Cần trigger workflow để tạo approvals');
    } else {
      approvals.forEach((approval, index) => {
        console.log(`\n${index + 1}. ${approval.workflow_step.step_name} (Bước ${approval.workflow_step.step_order})`);
        console.log(`   Người duyệt: ${approval.approver.full_name} (${approval.approver.email})`);
        console.log(`   Chức danh: ${approval.approver.position?.name || 'N/A'}`);
        console.log(`   Phòng ban: ${approval.approver.department?.name || 'N/A'}`);
        console.log(`   Trạng thái: ${approval.action}`);
        console.log(`   Ngày tạo: ${approval.created_at}`);
        console.log(`   Ngày xử lý: ${approval.acted_at || 'Chưa xử lý'}`);
      });
    }

    console.log('\n📊 TÓM TẮT');
    console.log('═══════════════════════════════════════');
    console.log(`Tổng số bước: ${steps.length}`);
    console.log(`Bước hiện tại: ${document.workflow_instance.current_step?.step_order || 'N/A'}`);
    console.log(`Phiếu phê duyệt đã tạo: ${approvals.length}`);
    console.log(`Trạng thái workflow: ${document.workflow_instance.status}`);

  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkApprovers();
