const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDocument() {
  console.log('🔍 Kiểm tra văn bản 024/2025...\n');

  try {
    // Find document by number
    const document = await prisma.documents.findFirst({
      where: {
        document_number: {
          contains: '024/2025'
        }
      },
      include: {
        owner: {
          select: {
            id: true,
            full_name: true,
            email: true
          }
        },
        document_type: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        department: {
          select: {
            id: true,
            name: true
          }
        },
        workflow_instance: {
          include: {
            workflow: {
              select: {
                id: true,
                name: true,
                description: true
              }
            },
            current_step: {
              select: {
                id: true,
                step_name: true,
                step_order: true,
                approver_type: true,
                participant_role: true
              }
            }
          }
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                full_name: true,
                email: true
              }
            },
            workflow_step: {
              select: {
                id: true,
                step_name: true,
                step_order: true,
                approver_type: true,
                participant_role: true
              }
            }
          },
          orderBy: {
            created_at: 'asc'
          }
        },
        sign_request: {
          include: {
            signers: {
              include: {
                user: {
                  select: {
                    id: true,
                    full_name: true,
                    email: true
                  }
                }
              },
              orderBy: {
                signing_order: 'asc'
              }
            }
          }
        }
      }
    });

    if (!document) {
      console.log('❌ Không tìm thấy văn bản với số 024/2025');
      console.log('\n💡 Tìm kiếm các văn bản có số gần giống...');
      
      const similarDocs = await prisma.documents.findMany({
        where: {
          OR: [
            { document_number: { contains: '024' } },
            { document_number: { contains: '2025' } }
          ]
        },
        select: {
          id: true,
          document_number: true,
          title: true,
          status: true,
          created_at: true
        },
        take: 10,
        orderBy: {
          created_at: 'desc'
        }
      });

      if (similarDocs.length > 0) {
        console.log('\nVăn bản tìm thấy:');
        similarDocs.forEach(doc => {
          console.log(`  - ID: ${doc.id} | Số: ${doc.document_number} | Tiêu đề: ${doc.title || 'N/A'} | Trạng thái: ${doc.status}`);
        });
      } else {
        console.log('Không tìm thấy văn bản nào tương tự');
      }
      return;
    }

    console.log('✅ Tìm thấy văn bản!\n');
    console.log('📄 THÔNG TIN VĂN BẢN');
    console.log('═══════════════════════════════════════');
    console.log(`ID: ${document.id}`);
    console.log(`Số văn bản: ${document.document_number}`);
    console.log(`Tiêu đề: ${document.title || 'N/A'}`);
    console.log(`Trạng thái: ${document.status}`);
    console.log(`Loại văn bản: ${document.document_type?.name || 'N/A'} (${document.document_type?.code || 'N/A'})`);
    console.log(`Phòng ban: ${document.department?.name || 'N/A'}`);
    console.log(`Người tạo: ${document.owner?.full_name || 'N/A'} (${document.owner?.email || 'N/A'})`);
    console.log(`Ngày tạo: ${document.created_at}`);
    console.log(`File gốc: ${document.file_path}`);
    console.log(`File đã ký: ${document.signed_file_path || 'Chưa có'}`);

    // Check workflow
    console.log('\n🔄 LUỒNG PHÊ DUYỆT');
    console.log('═══════════════════════════════════════');
    
    if (!document.workflow_instance) {
      console.log('❌ Văn bản này KHÔNG CÓ luồng phê duyệt');
      console.log('\n💡 Lý do có thể:');
      console.log('  - Loại văn bản không yêu cầu phê duyệt');
      console.log('  - Chưa được gán workflow');
      console.log('  - Văn bản được tạo trực tiếp không qua workflow');
    } else {
      console.log('✅ Văn bản này CÓ luồng phê duyệt');
      console.log(`\nWorkflow: ${document.workflow_instance.workflow.name}`);
      console.log(`Mô tả: ${document.workflow_instance.workflow.description || 'N/A'}`);
      console.log(`Trạng thái workflow: ${document.workflow_instance.status}`);
      console.log(`Bắt đầu: ${document.workflow_instance.started_at}`);
      console.log(`Hoàn thành: ${document.workflow_instance.completed_at || 'Chưa hoàn thành'}`);
      
      if (document.workflow_instance.current_step) {
        console.log(`\nBước hiện tại: ${document.workflow_instance.current_step.step_name}`);
        console.log(`Thứ tự: ${document.workflow_instance.current_step.step_order}`);
        console.log(`Loại người duyệt: ${document.workflow_instance.current_step.approver_type}`);
        console.log(`Vai trò: ${document.workflow_instance.current_step.participant_role || 'N/A'}`);
      }

      // Show approvals
      console.log('\n📋 LỊCH SỬ PHÊ DUYỆT');
      console.log('═══════════════════════════════════════');
      
      if (document.approvals.length === 0) {
        console.log('Chưa có phê duyệt nào');
      } else {
        document.approvals.forEach((approval, index) => {
          console.log(`\n${index + 1}. ${approval.workflow_step.step_name} (Bước ${approval.workflow_step.step_order})`);
          console.log(`   Người duyệt: ${approval.approver.full_name} (${approval.approver.email})`);
          console.log(`   Vai trò: ${approval.workflow_step.participant_role || 'N/A'}`);
          console.log(`   Hành động: ${approval.action}`);
          console.log(`   Thời gian: ${approval.acted_at || 'Chưa xử lý'}`);
          if (approval.comment) {
            console.log(`   Nhận xét: ${approval.comment}`);
          }
          if (approval.signature_data) {
            console.log(`   Đã ký: ✅`);
          }
        });
      }
    }

    // Check sign request
    console.log('\n✍️ LUỒNG KÝ');
    console.log('═══════════════════════════════════════');
    
    if (!document.sign_request) {
      console.log('❌ Văn bản này KHÔNG CÓ luồng ký');
    } else {
      console.log('✅ Văn bản này CÓ luồng ký');
      console.log(`\nTiêu đề: ${document.sign_request.title || 'N/A'}`);
      console.log(`Trạng thái: ${document.sign_request.status}`);
      console.log(`Loại workflow: ${document.sign_request.workflow_type || 'N/A'}`);
      console.log(`Deadline: ${document.sign_request.deadline || 'Không có'}`);
      console.log(`Tự động tạo: ${document.sign_request.auto_created ? 'Có' : 'Không'}`);

      if (document.sign_request.signers.length === 0) {
        console.log('\nChưa có người ký nào');
      } else {
        console.log(`\nDanh sách người ký (${document.sign_request.signers.length}):`);
        document.sign_request.signers.forEach((signer, index) => {
          console.log(`\n${index + 1}. ${signer.is_internal ? '👤 Internal' : '📧 External'}`);
          if (signer.is_internal && signer.user) {
            console.log(`   Người ký: ${signer.user.full_name} (${signer.user.email})`);
          } else {
            console.log(`   Người ký: ${signer.name} (${signer.email})`);
          }
          console.log(`   Thứ tự: ${signer.signing_order || 'N/A'}`);
          console.log(`   Vai trò: ${signer.role || 'N/A'}`);
          console.log(`   Trạng thái: ${signer.status}`);
          console.log(`   Đã ký: ${signer.signed_at || 'Chưa ký'}`);
          if (signer.signature_data) {
            console.log(`   Loại chữ ký: ${signer.signature_type || 'N/A'}`);
          }
        });
      }
    }

    // Summary
    console.log('\n📊 TÓM TẮT');
    console.log('═══════════════════════════════════════');
    console.log(`Có luồng phê duyệt: ${document.workflow_instance ? '✅ CÓ' : '❌ KHÔNG'}`);
    console.log(`Có luồng ký: ${document.sign_request ? '✅ CÓ' : '❌ KHÔNG'}`);
    
    if (document.workflow_instance) {
      const totalApprovals = document.approvals.length;
      const completedApprovals = document.approvals.filter(a => a.action === 'approved').length;
      const pendingApprovals = document.approvals.filter(a => a.action === 'pending').length;
      const rejectedApprovals = document.approvals.filter(a => a.action === 'rejected').length;
      
      console.log(`\nPhê duyệt: ${completedApprovals}/${totalApprovals} hoàn thành`);
      console.log(`  - Đã duyệt: ${completedApprovals}`);
      console.log(`  - Đang chờ: ${pendingApprovals}`);
      console.log(`  - Từ chối: ${rejectedApprovals}`);
    }
    
    if (document.sign_request) {
      const totalSigners = document.sign_request.signers.length;
      const signedCount = document.sign_request.signers.filter(s => s.status === 'signed').length;
      const pendingCount = document.sign_request.signers.filter(s => s.status === 'pending').length;
      
      console.log(`\nKý: ${signedCount}/${totalSigners} hoàn thành`);
      console.log(`  - Đã ký: ${signedCount}`);
      console.log(`  - Đang chờ: ${pendingCount}`);
    }

  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocument();
