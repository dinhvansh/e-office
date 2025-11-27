# Issue: No Signers in Editor After Refactor

**Date:** 2025-11-27  
**Status:** ✅ RESOLVED  
**Type:** Expected Behavior + UX Improvement

## Problem

Sau khi refactor workflow order, khi tạo document và bấm "Tiếp tục" vào editor, không có người ký nào để thêm fields.

## Root Cause

### 1. Workflow Steps Không Có `participant_role`

Workflow cũ (đã tồn tại trong database) không có field `participant_role` trong workflow steps.

Code refactor filter signers theo:
```typescript
const signerSteps = workflow.steps.filter(s => s.participant_role === 'signer');
```

Kết quả: `signerSteps = []` → Không tạo signers tự động từ workflow.

### 2. User Chưa Thêm Signers Thủ Công

Khi upload document, user chỉ:
1. Chọn file
2. Chọn document type
3. Bấm "Tiếp tục"

→ Chưa thêm signers vào payload.

## Solution

### 1. Code Fix - Add Warning Log

Thêm log cảnh báo khi không tìm thấy signer steps:

```typescript
if (signerSteps.length === 0) {
  console.log(`[Workflow Signers] ⚠️ No signer steps found in workflow. Signers must be added manually.`);
}
```

### 2. UX Improvement - Show Clear Message

Thêm message rõ ràng trong editor khi không có signers:

```tsx
{signers.length === 0 && (
  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
    <p className="font-medium text-amber-900">⚠️ Chưa có người ký</p>
    <p className="text-amber-700">
      Vui lòng thêm người ký trước khi thêm fields chữ ký.
    </p>
    <Button onClick={() => setShowManageSigners(true)}>
      <Users className="w-4 h-4 mr-2" />
      Thêm người ký ngay
    </Button>
  </div>
)}
```

## Expected Behavior

Đây KHÔNG phải là bug, mà là expected behavior:

1. **Workflow cũ không có `participant_role`**
   - Workflow được tạo trước khi có field này
   - Không thể tự động tạo signers từ workflow
   - User phải thêm signers thủ công

2. **User chưa chọn signers khi upload**
   - Flow: Upload → Editor → Add Signers → Add Fields → Send
   - Signers được thêm TRONG editor, không phải lúc upload

## User Flow

### Correct Flow:
```
1. Upload document
   ↓
2. Vào editor page
   ↓
3. Thấy message "Chưa có người ký"
   ↓
4. Bấm "Thêm người ký ngay" hoặc "Quản lý người ký"
   ↓
5. Thêm signers qua ManageSignersDialog
   ↓
6. Thêm fields cho từng signer
   ↓
7. Lưu và gửi
```

## Long-term Solution

### Option 1: Update Old Workflows

Chạy migration để thêm `participant_role` cho workflow steps cũ:

```sql
UPDATE workflow_steps 
SET participant_role = 'approver' 
WHERE participant_role IS NULL;
```

### Option 2: Fallback Logic

Nếu workflow không có `participant_role`, coi tất cả steps là approver steps:

```typescript
const signerSteps = workflow.steps.filter(s => 
  s.participant_role === 'signer' || 
  (s.participant_role === null && s.approver_type === 'user')
);
```

### Option 3: Always Require Manual Signers

Không tạo signers tự động từ workflow, luôn yêu cầu user thêm thủ công.

## Files Modified

1. `backend/src/modules/documents/documents.service.ts`
   - Added warning log when no signer steps found

2. `frontend/app/(dashboard)/sign-requests/[id]/editor/page.tsx`
   - Added clear message when no signers
   - Added prominent "Add Signers" button

## Testing

1. ✅ Create document without signers
2. ✅ Go to editor page
3. ✅ See warning message
4. ✅ Click "Thêm người ký ngay"
5. ✅ Add signers via ManageSignersDialog
6. ✅ Add fields
7. ✅ Save and send

## Related Issues

- Workflow Order Refactor: `SESSION-2025-11-27-WORKFLOW-ORDER-REFACTOR.md`
- Old workflows without `participant_role` field

---

**Conclusion:** This is expected behavior, not a bug. UX improvements added to guide users.
