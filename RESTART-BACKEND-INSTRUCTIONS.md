# ⚠️ BACKEND RESTART REQUIRED

## Vấn đề
Backend cần restart để nhận thay đổi Prisma schema (`document_approvals` table).

## Lỗi hiện tại
```
Internal server error
```

Nguyên nhân: Prisma client chưa được generate lại sau khi đổi tên table từ `approvals` → `document_approvals`

## Cách sửa

### Bước 1: Stop Backend
Nếu backend đang chạy, dừng nó lại:
- Tìm terminal đang chạy backend
- Nhấn `Ctrl + C` để stop

### Bước 2: Generate Prisma Client
```bash
cd backend
npx prisma generate
```

**Lưu ý:** Nếu gặp lỗi `EPERM: operation not permitted`, đảm bảo:
- Backend đã stop hoàn toàn
- Không có process nào đang sử dụng file `query_engine-windows.dll.node`
- Có thể cần đóng VSCode/IDE và mở lại

### Bước 3: Start Backend
```bash
npm run dev
```

### Bước 4: Test
1. Mở trình duyệt
2. Navigate to: `http://localhost:3000/sign-requests/41/internal-sign`
3. Kiểm tra:
   - ✅ PDF hiển thị
   - ✅ Lịch sử phê duyệt hiển thị (nếu có)
   - ✅ Danh sách người ký hiển thị
   - ✅ Signature canvas hoạt động
   - ✅ Không còn "Internal server error"

## Thay đổi đã làm

### Backend
- `backend/src/modules/signRequests/signRequests.repository.ts`
  - Đổi `approvals` → `document_approvals`

### Frontend  
- `frontend/app/(dashboard)/sign-requests/[id]/internal-sign/page.tsx`
  - Map `action` → `status`
  - Map `comment` → `comments`
  - Map `acted_at` → `approved_at/rejected_at`

## Nếu vẫn lỗi

### Option 1: Xóa và generate lại
```bash
cd backend
rm -rf node_modules/.prisma
npx prisma generate
```

### Option 2: Reinstall dependencies
```bash
cd backend
rm -rf node_modules
npm install
npx prisma generate
```

### Option 3: Restart máy
Nếu file vẫn bị lock, restart máy để giải phóng tất cả file handles.

## Kiểm tra backend có chạy không

```bash
# Windows
netstat -ano | findstr :4000

# Nếu có process, kill nó
taskkill /PID <PID> /F
```

## Sau khi fix xong

Xóa file này:
```bash
rm RESTART-BACKEND-INSTRUCTIONS.md
```

---

**Created:** 2025-11-28  
**Status:** ⚠️ Action Required
