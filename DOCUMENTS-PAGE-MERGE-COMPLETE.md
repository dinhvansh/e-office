# Documents Page Merge - Complete

## Tổng quan

Đã gộp thành công 2 trang `/documents` và `/documents/archive` thành 1 trang duy nhất với tabs để chuyển đổi giữa các view.

## Thay đổi

### 1. UI/UX Improvements

**Tabs Navigation:**
- Tab "📋 Tất cả tài liệu" - Hiển thị tất cả tài liệu với đầy đủ filter
- Tab "📦 Quản lý lưu trữ" - Chỉ hiển thị tài liệu completed/archived/cancelled

**Smart Filtering:**
- Khi chuyển sang tab "Quản lý lưu trữ", filter tự động chuyển sang "Hoàn thành"
- Filter options thay đổi theo tab:
  - Tab "Tất cả": 10 trạng thái (draft → archived)
  - Tab "Quản lý lưu trữ": 3 trạng thái (completed, archived, cancelled)

**Action Buttons:**
- Tab "Tất cả tài liệu":
  - Xem, Tải xuống, Fields, Trình duyệt, Hủy luồng ký, Xóa (theo trạng thái)
- Tab "Quản lý lưu trữ":
  - Xem, Tải xuống
  - **Thanh lý** (chỉ với completed)
  - **Hủy** (chỉ với completed)
  - "Không thể thao tác" (với archived/cancelled)

### 2. Code Changes

**Files Modified:**

1. `frontend/app/(dashboard)/documents/page.tsx`
   - Thêm import: `Tabs`, `Archive`, `XCircle`
   - Thêm state: `activeTab`
   - Thêm mutations: `archiveDocumentMutation`, `cancelDocumentMutation`
   - Thêm handlers: `handleArchiveDocument`, `handleCancelDocument`
   - Thêm Tabs UI component
   - Conditional filter options dựa trên activeTab
   - Conditional action buttons dựa trên activeTab và status

2. `frontend/constants/sidebarItems.ts`
   - Xóa menu item "Quản lý tài liệu" (`/documents/archive`)
   - Giữ lại chỉ 1 menu "Tài liệu" (`/documents`)

**Files Deleted:**

3. `frontend/app/(dashboard)/documents/archive/page.tsx`
   - Đã xóa hoàn toàn (không cần nữa)

### 3. Features

**Tab "Tất cả tài liệu":**
- ✅ Upload tài liệu mới
- ✅ Xem tất cả tài liệu
- ✅ Filter theo 10 trạng thái
- ✅ Search theo tên, số văn bản
- ✅ Actions: Xem, Tải, Fields, Trình duyệt, Hủy luồng, Xóa

**Tab "Quản lý lưu trữ":**
- ✅ Xem tài liệu hoàn thành
- ✅ Filter theo 3 trạng thái (completed, archived, cancelled)
- ✅ Search theo tên, số văn bản
- ✅ Actions: Xem, Tải, Thanh lý, Hủy
- ✅ Disable actions cho tài liệu đã archived/cancelled

### 4. Business Logic

**Archive Document:**
- Chỉ tài liệu `completed` mới có thể thanh lý
- Sau khi thanh lý, status → `archived`
- Không thể thao tác thêm

**Cancel Document:**
- Chỉ tài liệu `completed` mới có thể hủy
- Sau khi hủy, status → `cancelled`
- Không thể thao tác thêm

**Auto-refresh:**
- Sau archive/cancel, danh sách tự động refresh
- Toast notification hiển thị kết quả

## Cách sử dụng

### 1. Xem tất cả tài liệu
1. Vào `/documents`
2. Mặc định ở tab "📋 Tất cả tài liệu"
3. Sử dụng filter và search như bình thường

### 2. Quản lý lưu trữ
1. Vào `/documents`
2. Click tab "📦 Quản lý lưu trữ"
3. Filter tự động chuyển sang "Hoàn thành"
4. Chỉ hiển thị tài liệu completed/archived/cancelled

### 3. Thanh lý tài liệu
1. Vào tab "📦 Quản lý lưu trữ"
2. Tìm tài liệu có trạng thái "✅ Hoàn thành"
3. Click nút "Thanh lý"
4. Xác nhận
5. Trạng thái đổi thành "📦 Đã thanh lý"

### 4. Hủy tài liệu
1. Vào tab "📦 Quản lý lưu trữ"
2. Tìm tài liệu có trạng thái "✅ Hoàn thành"
3. Click nút "Hủy"
4. Xác nhận
5. Trạng thái đổi thành "🚫 Đã hủy"

## Benefits

### UX Improvements
- ✅ Giảm số menu items trong sidebar (từ 2 xuống 1)
- ✅ Dễ dàng chuyển đổi giữa các view
- ✅ Không cần navigate sang trang khác
- ✅ Context được giữ nguyên (search, pagination)

### Code Quality
- ✅ Giảm code duplication
- ✅ Dễ maintain hơn (1 file thay vì 2)
- ✅ Consistent UI/UX
- ✅ Reuse mutations và handlers

### Performance
- ✅ Không cần load 2 pages riêng biệt
- ✅ Shared query cache
- ✅ Faster navigation (tab switching vs page navigation)

## Testing

**Manual Testing:**
1. ✅ Tab switching hoạt động mượt
2. ✅ Filter options thay đổi theo tab
3. ✅ Action buttons hiển thị đúng theo tab và status
4. ✅ Archive document thành công
5. ✅ Cancel document thành công
6. ✅ Toast notifications hiển thị đúng
7. ✅ Auto-refresh sau archive/cancel
8. ✅ Search hoạt động trên cả 2 tabs
9. ✅ Pagination reset khi đổi tab
10. ✅ Sidebar không còn link archive

**Backend API:**
- ✅ `POST /api/v1/documents/:id/archive` - Hoạt động tốt
- ✅ `POST /api/v1/documents/:id/cancel` - Hoạt động tốt
- ✅ `GET /api/v1/documents?status=...&search=...` - Hoạt động tốt

## Migration Notes

**Không cần migration:**
- Không có breaking changes
- Old URL `/documents/archive` sẽ 404 (có thể thêm redirect nếu cần)
- Tất cả functionality được giữ nguyên

**Redirect (Optional):**
Nếu muốn redirect old URL sang new tab:
```typescript
// frontend/app/(dashboard)/documents/archive/page.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ArchiveRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/documents?tab=archive');
  }, [router]);
  return null;
}
```

## Screenshots

**Tab "Tất cả tài liệu":**
- Upload form ở trên
- Filter: 10 options
- Actions: Full set

**Tab "Quản lý lưu trữ":**
- Không có upload form
- Filter: 3 options (completed, archived, cancelled)
- Actions: Xem, Tải, Thanh lý, Hủy

## Hoàn thành

✅ Gộp 2 trang thành 1 với tabs
✅ Smart filtering theo tab
✅ Conditional action buttons
✅ Archive và Cancel functionality
✅ Xóa trang archive cũ
✅ Cập nhật sidebar
✅ Testing và verification
✅ Documentation

---

**Ngày hoàn thành:** 30/11/2025
**Thời gian thực hiện:** ~20 phút
**Impact:** Better UX, cleaner navigation, easier maintenance
