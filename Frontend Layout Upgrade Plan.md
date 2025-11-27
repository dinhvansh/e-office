Frontend Layout Upgrade Plan
Phân tích hiện trạng
✅ Đã có (Không cần nâng cấp)
Layout cơ bản: Sidebar navigation với collapsible mode hoạt động tốt
Dashboard trang: Có sẵn 
page.tsx
 với metrics và recent documents
Routing structure: Next.js App Router được cấu trúc tốt với 
(dashboard)
 group
❌ Thiếu (Cần bổ sung)
1. Dashboard Page - Chưa kết nối API mới
Vấn đề:

Dashboard hiện tại chỉ hiển thị số liệu từ API /documents
KHÔNG sử dụng API /dashboard/stats mới tạo (có pending approvals, pending signatures, recent activities)
Cần làm:

Refactor app/(dashboard)/page.tsx để gọi API /api/v1/dashboard/stats
Hiển thị thêm metrics: "Chờ tôi duyệt", "Chờ tôi ký"
Thêm Recent Activities timeline từ audit logs
2. Notifications Component - Hoàn toàn thiếu
Vấn đề:

Backend đã có API /notifications nhưng frontend chưa có component nào
Người dùng không thể xem thông báo in-app
Cần làm:

Tạo component NotificationBell hiển thị icon + badge số lượng chưa đọc
Tạo component NotificationDropdown với danh sách thông báo
Tạo trang /notifications để xem toàn bộ lịch sử
Thêm NotificationBell vào Header/TopBar (hiện tại layout chưa có TopBar)
3. Sidebar Navigation - Thiếu link Dashboard
Vấn đề:

Sidebar có thể chưa có link đến "/dashboard" hoặc trang chủ
Cần kiểm tra:

File 
constants/sidebarItems.ts
 (hoặc 
.tsx
)
Kế hoạch thực hiện
Phase 1: Notifications (Ưu tiên cao)
[NEW] components/notifications/NotificationBell.tsx - Icon + Badge
[NEW] components/notifications/NotificationDropdown.tsx - Dropdown list
[NEW] app/(dashboard)/notifications/page.tsx - Trang lịch sử đầy đủ
[MODIFY] app/(dashboard)/layout.tsx - Thêm TopBar với NotificationBell
Phase 2: Dashboard Enhancement
[MODIFY] app/(dashboard)/page.tsx - Kết nối /dashboard/stats API
[NEW] components/dashboard/RecentActivities.tsx - Timeline component
[NEW] components/dashboard/TasksSummary.tsx - Pending approvals/signatures
Phase 3: Sidebar Polish
[MODIFY] 
constants/sidebarItems.ts
 - Đảm bảo có Dashboard link
[OPTIONAL] Thêm notification badge vào sidebar items nếu cần
Chi tiết kỹ thuật
Notification Bell Component
// Sử dụng React Query để polling hoặc WebSocket
const { data: notifications } = useQuery({
  queryKey: ['notifications'],
  queryFn: () => fetchJson('/notifications?limit=5'),
  refetchInterval: 30000 // Poll mỗi 30s
});
const unreadCount = notifications?.unreadCount ?? 0;
Dashboard Stats API Integration
const { data: stats } = useQuery({
  queryKey: ['dashboard-stats'],
  queryFn: () => fetchJson('/dashboard/stats')
});
// stats.documents: { total, draft, pending_approval, approved, rejected, completed }
// stats.tasks: { pending_approvals, pending_signatures, total_pending }
// stats.recent_activities: [...audit logs]
Ưu tiên thực hiện
Cao: Notifications (cần thiết để user biết có việc cần làm)
Cao: Dashboard stats (thay thế logic cũ bằng API mới)
Thấp: Sidebar adjustments (nếu cần)