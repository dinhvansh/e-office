# Session 2025-11-28: Internal Signing Page Implementation

## Summary

Implemented internal signing page with approval history, signers list, PDF viewer, and signature canvas.

## Issues Fixed

### 1. OTP Expiry Error Handling
**Problem:** Frontend không bắt được error message "OTP expired" từ backend  
**Solution:** Backend trả về error format `{ success: false, error: { message: "..." } }` nhưng frontend đang check `result.message`. Đã update frontend check cả `result.error?.message`

**Files Changed:**
- `frontend/app/sign/[token]/page.tsx` - Updated error handling in 4 places

### 2. Internal Signing Page Enhanced
**Problem:** Cần hiển thị approval history, signers list, và PDF viewer  
**Solution:** Created new internal signing page with sidebar showing approvals and signers

**Files Created:**
- `frontend/components/signing/ApprovalHistory.tsx`
- `frontend/components/signing/InternalSigningSidebar.tsx`
- `frontend/app/(dashboard)/sign-requests/[id]/internal-sign/page.tsx`

**Files Updated:**
- `frontend/app/(dashboard)/sign-requests/[id]/sign/page.tsx` - Redirect to internal-sign
- `backend/src/modules/signRequests/signRequests.repository.ts` - Include document_approvals

### 3. Approval Data Structure Issue
**Problem:** 
- Backend query sai table: `approvals` (không tồn tại) thay vì `document_approvals`
- Field sai: `status` thay vì `action`, `comments` thay vì `comment`
- Tất cả approvals có status = undefined

**Root Cause:**
- Prisma schema có table `document_approvals` với field `action` (not `status`)
- Backend repository đang query table `approvals` (không tồn tại)

**Solution:**
```typescript
// Backend: signRequests.repository.ts
document: {
  include: {
    document_approvals: {  // Changed from 'approvals'
      include: {
        approver: { ... }
      }
    }
  }
}

// Frontend: Map fields
approvals={data.sign_request.document.document_approvals?.map(a => ({
  id: a.id,
  status: a.action,           // Map 'action' to 'status'
  comments: a.comment,        // Map 'comment' to 'comments'
  approved_at: a.action === 'approved' ? a.acted_at : null,
  rejected_at: a.action === 'rejected' ? a.acted_at : null,
  approver: a.approver
}))}
```

### 4. PDF Viewer Issue
**Problem:** Không xem được PDF trong iframe  
**Solution:** 
- Đổi từ `<object>` về `<iframe>` đơn giản hơn
- Thêm button "Tải xuống PDF" làm fallback

### 5. SignatureCanvas Error
**Problem:** `backgroundColor` prop không hợp lệ  
**Solution:** Dùng `style` trong `canvasProps` thay vì `backgroundColor` prop

```typescript
<SignatureCanvas
  ref={sigCanvasRef}
  canvasProps={{
    className: 'w-full h-48 cursor-crosshair',
    style: { background: 'white' }  // Instead of backgroundColor prop
  }}
/>
```

## Current Status

### ✅ Completed
- OTP expiry error handling
- Internal signing page UI
- Approval history component
- Signers list component
- PDF viewer
- Signature canvas
- Submit functionality

### ⚠️ Pending Issues
1. **Prisma Generate Error**: Need to restart backend and run `npx prisma generate`
2. **Document Approvals Query**: Backend may need restart to pick up new Prisma client

## Next Steps

1. **Restart Backend Server**
   ```bash
   # Stop backend
   # Run: npx prisma generate
   # Start backend again
   ```

2. **Test Internal Signing Flow**
   - Navigate to sign request
   - Click "Ký" button
   - Should redirect to `/sign-requests/:id/internal-sign`
   - Should see:
     - PDF viewer
     - Approval history (if any)
     - Signers list
     - Signature canvas
     - Submit button

3. **Verify Approval Data**
   - Check console.log for approval data
   - Verify status colors (approved=green, rejected=red, pending=yellow)

## Files Modified

### Backend
- `backend/src/modules/signRequests/signRequests.repository.ts`

### Frontend
- `frontend/app/sign/[token]/page.tsx`
- `frontend/app/(dashboard)/sign-requests/[id]/sign/page.tsx`
- `frontend/app/(dashboard)/sign-requests/[id]/internal-sign/page.tsx` (new)
- `frontend/components/signing/ApprovalHistory.tsx` (new)
- `frontend/components/signing/InternalSigningSidebar.tsx` (new)

### Scripts
- `backend/scripts/check-approvals-022.js` (new)
- `backend/scripts/test-internal-signing-page.js`

## Database Schema Reference

```prisma
model document_approvals {
  id                Int       @id @default(autoincrement())
  document_id       Int
  workflow_id       Int
  workflow_step_id  Int
  approver_user_id  Int
  action            String    @default("pending") // 'pending', 'approved', 'rejected'
  comment           String?
  signature_data    String?
  signature_type    String?
  acted_at          DateTime?
  created_at        DateTime  @default(now())
  
  document          documents @relation(fields: [document_id], references: [id])
  approver          users @relation(fields: [approver_user_id], references: [id])
}
```

## Key Learnings

1. **Always check Prisma schema** for actual table and field names
2. **Backend error format** is `{ success: false, error: { message, code } }`
3. **Frontend should check both** `result.error?.message` and `result.message`
4. **SignatureCanvas** doesn't accept `backgroundColor` prop, use `canvasProps.style`
5. **After schema changes**, always run `npx prisma generate` and restart server

## Related Documents

- `docs/dev/FIX-OTP-EXPIRY-ERROR-HANDLING.md`
- `docs/dev/FEATURE-INTERNAL-SIGNING-PAGE-ENHANCED.md`
- `docs/dev/FEATURE-UNIFIED-SIGNING-UI.md`
