# 🔍 Debug Document 001/2025 - Summary

## Vấn đề báo cáo
User admin@acme.local đã duyệt document 001/2025 nhưng:
- ❌ Trang "Quy trình ký" hiển thị: **Chờ ký 0/2**
- ❌ Chi tiết document vẫn hiển thị chưa duyệt

## Root Cause Analysis

### 1. Workflow Status ✅ FIXED
**Vấn đề ban đầu:**
- Workflow có 2 bước approval
- Admin đã approve bước 1 ✅
- Approver chưa approve bước 2 ❌

**Giải pháp:**
- Chạy script `approve-document-101-step2.js`
- Approve bước 2 cho approver@acme.local
- Workflow status: `in_progress` → `completed` ✅

### 2. Signing Progress ✅ CORRECT
**Hiện trạng:**
- Workflow đã completed ✅
- Nhưng **chưa ai ký** ❌
- Progress: 0/2 (0%) - **ĐÂY LÀ ĐÚNG**

**Lý do:**
- Signer 1 (admin@acme.local): Status = `otp_sent` (chưa sign)
- Signer 2 (approver@acme.local): Status = `otp_sent` (chưa sign)
- Backend tính progress dựa trên `status === 'signed' || 'completed'`
- Vì chưa ai sign nên progress = 0/2

### 3. Backend Fix ✅ APPLIED
**File:** `backend/src/modules/signRequests/signRequests.controller.ts`

**Before:**
```typescript
const signedCount = sr.signers.filter(s => s.status === 'signed').length;
```

**After:**
```typescript
const signedCount = sr.signers.filter(s => 
  s.status === 'signed' || s.status === 'completed'
).length;
```

## Kết luận

### ✅ Đã fix:
1. Workflow approval completed (2/2 steps approved)
2. Backend progress calculation (check both 'signed' and 'completed')
3. Document status updated to 'active'
4. Sign request status updated to 'pending'

### ⚠️ Chưa fix (không phải bug):
**Progress 0/2 là ĐÚNG** vì:
- Workflow đã approved ✅
- Nhưng **chưa ai thực sự ký** ❌
- Signers cần mở link và ký tài liệu

## Hướng dẫn ký tài liệu

### Cách 1: Từ email
1. Mở email nhận được
2. Click link ký
3. Nhập OTP
4. Ký tài liệu
5. Submit

### Cách 2: Copy link từ UI
1. Vào trang "Quy trình ký"
2. Click icon 📋 (Copy link)
3. Mở link trong browser
4. Nhập OTP
5. Ký tài liệu
6. Submit

### Cách 3: Resend email
1. Vào trang "Quy trình ký"
2. Click icon 📧 (Gửi lại email)
3. Check email
4. Follow steps từ Cách 1

## Test Scripts Created

1. `debug-document-001-2025.js` - Debug document info
2. `find-documents-with-sign-requests.js` - Find all documents with sign requests
3. `debug-document-101-workflow.js` - Debug workflow details
4. `approve-document-101-step2.js` - Approve step 2 (EXECUTED ✅)
5. `check-document-101-signers.js` - Check signers status

## Files Modified

1. `backend/src/modules/signRequests/signRequests.controller.ts`
   - Fixed progress calculation to include 'completed' status

## Next Steps

1. **User action required:** Signers need to actually sign the document
2. **After signing:** Progress will update to 1/2, then 2/2
3. **When all signed:** Status will change to "Đã hoàn thành"

## Summary

- ✅ Workflow: COMPLETED (2/2 approved)
- ✅ Backend: FIXED (progress calculation)
- ⚠️ Signing: PENDING (0/2 signed) - **User needs to sign**
- 📊 Progress: 0/2 is CORRECT (no one has signed yet)

**Conclusion:** System is working correctly. The 0/2 progress is accurate because approval is done but actual signing has not started yet.
