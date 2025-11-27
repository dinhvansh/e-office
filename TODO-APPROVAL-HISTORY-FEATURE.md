# ⚠️ TODO: Thêm Approval History vào Internal Signing Page

**Date:** 2025-11-28  
**Status:** ⏸️ Pending - Cần restart backend  
**Priority:** Medium

---

## 🎯 Mục tiêu

Hiển thị lịch sử phê duyệt (approval history) trong trang ký nội bộ (internal signing page).

## 📋 Hiện trạng

### ✅ Đã hoàn thành
- Trang internal signing hoạt động bình thường
- PDF viewer hiển thị được
- Danh sách người ký hiển thị đúng
- Signature canvas hoạt động
- Submit ký thành công

### ⚠️ Chưa hoàn thành
- **Approval history không hiển thị** (đã tạm thời disable để tránh lỗi 500)

## 🐛 Vấn đề gặp phải

### Lỗi chính: Internal Server Error 500

**Nguyên nhân:**
1. Prisma schema có table `document_approvals` (không phải `approvals`)
2. Backend repository đã update query sang `document_approvals`
3. **Nhưng Prisma client chưa được generate lại** → Backend vẫn dùng client cũ
4. Khi query `document_approvals`, Prisma client không nhận ra → 500 error

### Lỗi khi generate Prisma

```bash
Error: EPERM: operation not permitted, rename 
'backend\node_modules\.prisma\client\query_engine-windows.dll.node.tmp20756' 
-> 'backend\node_modules\.prisma\client\query_engine-windows.dll.node'
```

**Nguyên nhân:** Backend process đang lock file `query_engine-windows.dll.node`

## 🔧 Cách fix (Làm ngày mai)

### Bước 1: Stop Backend hoàn toàn

```bash
# Tìm process đang chạy trên port 4000
netstat -ano | findstr :4000

# Kill process (thay <PID> bằng số thực tế)
taskkill /PID <PID> /F

# Hoặc đơn giản: Ctrl+C trong terminal đang chạy backend
```

### Bước 2: Generate Prisma Client

```bash
cd backend
npx prisma generate
```

**Nếu vẫn lỗi EPERM:**
```bash
# Option 1: Xóa folder .prisma
rm -rf node_modules/.prisma
npx prisma generate

# Option 2: Reinstall
rm -rf node_modules
npm install
npx prisma generate

# Option 3: Restart máy (last resort)
```

### Bước 3: Uncomment code đã disable

#### File 1: `backend/src/modules/signRequests/signRequests.repository.ts`

**Hiện tại (đã revert):**
```typescript
findById(id: number, tenantId: number) {
  return prisma.sign_requests.findFirst({
    where: { id, tenant_id: tenantId },
    include: { 
      signers: {
        orderBy: { signing_order: 'asc' }
      }, 
      document: true  // ← Chỉ include document, không có approvals
    },
  });
}
```

**Cần đổi thành:**
```typescript
findById(id: number, tenantId: number) {
  return prisma.sign_requests.findFirst({
    where: { id, tenant_id: tenantId },
    include: { 
      signers: {
        orderBy: { signing_order: 'asc' }
      }, 
      document: {
        include: {
          document_approvals: {  // ← Thêm lại
            include: {
              approver: {
                select: {
                  id: true,
                  full_name: true,
                  email: true,
                  avatar_url: true
                }
              }
            },
            orderBy: { created_at: 'asc' }
          }
        }
      }
    },
  });
}
```

#### File 2: `frontend/app/(dashboard)/sign-requests/[id]/internal-sign/page.tsx`

**Hiện tại (đã disable):**
```typescript
<InternalSigningSidebar
  signers={data.sign_request.signers}
  activities={[]}
  currentSignerId={mySigner.id}
  approvals={[]}  // ← Empty array
/>
```

**Cần đổi thành:**
```typescript
<InternalSigningSidebar
  signers={data.sign_request.signers}
  activities={[]}
  currentSignerId={mySigner.id}
  approvals={(data.sign_request.document.document_approvals || []).map(a => ({
    id: a.id,
    status: a.action || 'pending',        // Map 'action' → 'status'
    comments: a.comment || null,          // Map 'comment' → 'comments'
    approved_at: a.action === 'approved' ? a.acted_at : null,
    rejected_at: a.action === 'rejected' ? a.acted_at : null,
    approver: a.approver
  }))}
/>
```

**Thêm interface:**
```typescript
document: {
  id: number;
  title: string;
  original_file_name: string;
  document_number: string;
  document_approvals?: any[];  // ← Thêm lại
};
```

### Bước 4: Start Backend

```bash
cd backend
npm run dev
```

### Bước 5: Test

1. Navigate to: `http://localhost:3000/sign-requests/41/internal-sign`
2. Kiểm tra:
   - ✅ Không còn 500 error
   - ✅ PDF hiển thị
   - ✅ Approval history hiển thị (nếu có)
   - ✅ Signers list hiển thị
   - ✅ Signature canvas hoạt động

## 📊 Database Schema Reference

```prisma
model document_approvals {
  id                Int       @id @default(autoincrement())
  document_id       Int
  workflow_id       Int
  workflow_step_id  Int
  approver_user_id  Int
  action            String    @default("pending")  // 'pending', 'approved', 'rejected'
  comment           String?                        // Note: singular 'comment'
  signature_data    String?
  signature_type    String?
  acted_at          DateTime?                      // When approved/rejected
  created_at        DateTime  @default(now())
  
  document          documents @relation(fields: [document_id], references: [id])
  approver          users @relation(fields: [approver_user_id], references: [id])
}
```

**Key Points:**
- Table name: `document_approvals` (not `approvals`)
- Status field: `action` (not `status`)
- Comments field: `comment` (not `comments`, singular!)
- Date field: `acted_at` (not `approved_at` or `rejected_at`)

## 🔍 Debugging Tips

### Check if Prisma client has document_approvals

```typescript
// In any backend file
console.log(Object.keys(prisma));
// Should include 'document_approvals'
```

### Check backend logs

Khi query, backend sẽ log error nếu table không tồn tại:
```
Error: Unknown arg `document_approvals` in include.document.include
```

### Test query trực tiếp

```bash
cd backend
node
```

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Test query
prisma.document_approvals.findMany({ take: 1 })
  .then(console.log)
  .catch(console.error);
```

## 📝 Files cần sửa

### Backend
- ✅ `backend/src/modules/signRequests/signRequests.repository.ts` - Đã sửa, cần uncomment

### Frontend
- ✅ `frontend/app/(dashboard)/sign-requests/[id]/internal-sign/page.tsx` - Đã sửa, cần uncomment
- ✅ `frontend/components/signing/ApprovalHistory.tsx` - Đã tạo, ready to use
- ✅ `frontend/components/signing/InternalSigningSidebar.tsx` - Đã tạo, ready to use

### Scripts (for testing)
- ✅ `backend/scripts/check-approvals-022.js` - Test approvals data
- ✅ `backend/scripts/check-document-022.js` - Test document with approvals

## ⏱️ Estimated Time

- Stop backend: 1 min
- Generate Prisma: 2 min
- Uncomment code: 5 min
- Test: 5 min
- **Total: ~15 minutes**

## ✅ Success Criteria

1. Backend starts without errors
2. Navigate to internal signing page → No 500 error
3. Approval history section appears (if document has approvals)
4. Approvals show correct status colors:
   - 🟢 Green = Approved
   - 🔴 Red = Rejected
   - 🟡 Yellow = Pending
5. Comments display correctly
6. Dates format correctly (dd/MM/yyyy HH:mm)

## 📚 Related Documents

- `docs/dev/SESSION-2025-11-28-INTERNAL-SIGNING-SUMMARY.md` - Full session summary
- `RESTART-BACKEND-INSTRUCTIONS.md` - Detailed restart instructions
- `docs/dev/FEATURE-INTERNAL-SIGNING-PAGE-ENHANCED.md` - Feature spec

---

**Note:** Hệ thống hiện tại hoạt động bình thường, chỉ thiếu approval history. Không cần vội, có thể làm khi rảnh.

**Created:** 2025-11-28 23:30  
**Last Updated:** 2025-11-28 23:30
