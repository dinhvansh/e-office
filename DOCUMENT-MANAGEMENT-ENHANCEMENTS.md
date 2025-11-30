# Document Management Enhancements - Complete

## Tổng quan

Đã hoàn thành các cải tiến cho trang quản lý tài liệu với filter, search, và các trạng thái mới (archived, cancelled).

## Các tính năng đã thêm

### 1. Trạng thái tài liệu mới

**Backend:**
- ✅ `archived` - Tài liệu đã thanh lý
- ✅ `cancelled` - Tài liệu đã hủy

**API Endpoints:**
- `POST /api/v1/documents/:id/archive` - Thanh lý tài liệu (chỉ completed)
- `POST /api/v1/documents/:id/cancel` - Hủy tài liệu (chỉ completed)

### 2. Filter theo trạng thái

**Trang Documents chính (`/documents`):**
- Dropdown filter với tất cả trạng thái:
  - 📋 Tất cả trạng thái
  - 📝 Nháp
  - ⏳ Chờ duyệt
  - ✅ Đã duyệt
  - ✍️ Chờ ký
  - ✅ Hoàn thành
  - ✅ Hoạt động
  - ❌ Từ chối
  - 🚫 Đã hủy
  - 📦 Đã thanh lý

**Trang Archive (`/documents/archive`):**
- Filter riêng cho:
  - ✅ Hoàn thành
  - 📦 Đã thanh lý
  - 🚫 Đã hủy

### 3. Tìm kiếm (Search)

**Trang Documents chính:**
- Input search tìm kiếm theo:
  - Tên tài liệu (title)
  - Tên file gốc (original_file_name)
  - Số văn bản (document_number)
  - Tóm tắt (summary)
- Tìm kiếm không phân biệt hoa thường (case-insensitive)

### 4. Màu sắc trạng thái

**StatusTag Component đã cập nhật:**
- ✅ Hoàn thành / Hoạt động: `bg-green-600 text-white` (xanh lá đậm)
- ⏳ Chờ duyệt: `bg-yellow-50 border-yellow-500 text-yellow-700` (vàng)
- ✍️ Chờ ký: `bg-blue-50 border-blue-500 text-blue-700` (xanh dương)
- ✅ Đã duyệt: `bg-green-50 border-green-500 text-green-700` (xanh lá nhạt)
- 📝 Nháp: `bg-gray-100 text-gray-700` (xám)
- ❌ Từ chối: `bg-red-600 text-white` (đỏ đậm)
- 🚫 Đã hủy: `bg-red-50 border-red-500 text-red-700` (đỏ nhạt)
- 📦 Đã thanh lý: `bg-orange-50 border-orange-500 text-orange-700` (cam)

### 5. UI/UX Improvements

**Trang Documents:**
- Search bar với icon 🔍
- Filter dropdown với emoji icons
- Hiển thị tổng số tài liệu từ pagination
- Reset về trang 1 khi thay đổi filter/search

**Trang Archive:**
- Nút "Thanh lý" và "Hủy" chỉ hiện với tài liệu completed
- Tài liệu đã archived/cancelled hiển thị "Không thể thao tác"
- Hover effects cho các nút action

## Cấu trúc code

### Backend

**Files đã sửa:**
1. `backend/src/modules/documents/documents.controller.ts`
   - Thêm `search` parameter vào `list()` method

2. `backend/src/modules/documents/documents.service.ts`
   - Thêm `search` parameter vào `listDocumentsPaginated()`
   - Methods `archiveDocument()` và `cancelDocument()` đã có sẵn

3. `backend/src/modules/documents/documents.repository.ts`
   - Thêm `search` parameter vào `listByTenantPaginated()`
   - Implement search với Prisma `OR` clause

### Frontend

**Files đã sửa:**
1. `frontend/app/(dashboard)/documents/page.tsx`
   - Thêm state: `statusFilter`, `searchQuery`
   - Thêm UI: search input và filter dropdown
   - Cập nhật query key để refetch khi filter/search thay đổi
   - Thêm màu sắc cho badges trạng thái

2. `frontend/app/(dashboard)/documents/archive/page.tsx`
   - Thêm filter dropdown cho archived/cancelled
   - Cập nhật StatusTag với màu sắc
   - Ẩn nút action cho tài liệu đã archived/cancelled

3. `frontend/components/ui/status-tag.tsx`
   - Thêm logic detect `archived` và `cancelled` status
   - Map sang variant `warning` và `danger`

## Testing

**Script test:**
```bash
node backend/scripts/test-document-archive-cancel.js
```

**Kết quả test:**
- ✅ Filter by status: Hoạt động tốt
- ✅ Search: Hoạt động tốt (case-insensitive)
- ✅ Archive document: Thành công
- ✅ Cancel document: Thành công
- ✅ Status colors: Hiển thị đúng

## Cách sử dụng

### 1. Tìm kiếm tài liệu
1. Vào trang `/documents`
2. Nhập từ khóa vào ô search
3. Kết quả tự động cập nhật

### 2. Filter theo trạng thái
1. Vào trang `/documents` hoặc `/documents/archive`
2. Chọn trạng thái từ dropdown
3. Danh sách tự động lọc

### 3. Thanh lý tài liệu
1. Vào trang `/documents/archive`
2. Tìm tài liệu có trạng thái "Hoàn thành"
3. Click nút 📦 "Thanh lý"
4. Xác nhận
5. Trạng thái đổi thành "Đã thanh lý"

### 4. Hủy tài liệu
1. Vào trang `/documents/archive`
2. Tìm tài liệu có trạng thái "Hoàn thành"
3. Click nút 🚫 "Hủy"
4. Xác nhận
5. Trạng thái đổi thành "Đã hủy"

## Lưu ý

- Chỉ tài liệu có trạng thái `completed` mới có thể archive hoặc cancel
- Tài liệu đã archived/cancelled không thể thao tác thêm
- Search không phân biệt hoa thường và tìm trong nhiều trường
- Filter và search có thể kết hợp với nhau

## Database Schema

Không cần migration mới - sử dụng trường `status` có sẵn trong bảng `documents`:
- Các giá trị status mới: `'archived'`, `'cancelled'`
- Type: `varchar` (đủ chứa các giá trị mới)

## Performance

- Search sử dụng Prisma `contains` với `mode: 'insensitive'`
- Nên thêm index cho các trường search nếu có nhiều dữ liệu:
  ```sql
  CREATE INDEX idx_documents_title ON documents(title);
  CREATE INDEX idx_documents_document_number ON documents(document_number);
  ```

## Hoàn thành

✅ Backend API với search và filter
✅ Frontend UI với search bar và filter dropdown
✅ Màu sắc trạng thái rõ ràng
✅ Archive và Cancel functionality
✅ Testing script
✅ Documentation

---

**Ngày hoàn thành:** 30/11/2025
**Thời gian thực hiện:** ~30 phút
