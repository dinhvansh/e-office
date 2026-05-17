# TODO: Fix Signing Issues for Document 027/2025

## Document Info
- **Document Number**: 027/2025
- **Document ID**: 79
- **Sign Request ID**: 46
- **Status**: completed
- **Signers**: 1 internal (vanqn95@gmail.com)
- **Fields**: 4 (signature, text, date, checkbox)

## Issues to Fix

### 1. ❌ Người nhận không được thông báo khi có yêu cầu ký
**Problem**: Internal signers không nhận email notification khi sign request được gửi

**Root Cause**: 
- Cần check `signRequests.service.ts` method `sendSignRequest()`
- Có thể email service không được gọi cho internal signers
- Hoặc notification service không tạo in-app notification

**Files to Check**:
- `backend/src/modules/signRequests/signRequests.service.ts`
- `backend/src/modules/common/email.service.ts`
- `backend/src/modules/notifications/notifications.service.ts`

**Fix Plan**:
- [ ] Check if email is sent to internal signers
- [ ] Check if in-app notification is created
- [ ] Add proper notification logic

---

### 2. ❌ Hộp thoại ký nhấp nháy khi đang vẽ chữ ký
**Problem**: Dialog flickers/blinks while drawing signature

**Root Cause**:
- Có thể do re-render không cần thiết
- State updates causing component to re-mount
- useEffect dependencies không đúng

**Files to Check**:
- `frontend/app/(dashboard)/sign-requests/[id]/internal-sign/page.tsx`
- `frontend/components/pdf/PDFSigningViewer.tsx`
- `frontend/components/signing/InternalSigningSidebar.tsx`

**Fix Plan**:
- [ ] Check useEffect dependencies
- [ ] Use useCallback/useMemo to prevent re-renders
- [ ] Ensure dialog state is stable during drawing

---

### 3. ❌ File tải về không có chữ ký
**Problem**: Downloaded PDF doesn't show signatures

**Root Cause**:
- PDF generation service không đọc được signature data
- position_data không được lưu đúng format
- generateSignedPdf() không được gọi sau khi hoàn thành

**Files to Check**:
- `backend/src/modules/signRequests/pdfGeneration.service.ts`
- `backend/src/modules/signRequests/signRequests.service.ts` (signInternal method)
- `backend/src/modules/signRequests/signRequests.controller.ts` (download endpoint)

**Fix Plan**:
- [ ] Verify position_data is saved correctly in signers table
- [ ] Check if generateSignedPdf() is called after completion
- [ ] Ensure download endpoint returns signed PDF, not original

---

### 4. ❌ Hiển thị số field sai (8/4) - mỗi lần sửa lại đếm
**Problem**: Field count shows 8/4 instead of correct count, increments on each edit

**Root Cause**:
- Fields không được xóa khi update
- Duplicate fields được tạo
- Frontend không filter deleted fields

**Files to Check**:
- `backend/src/modules/signRequests/signRequestFields.service.ts`
- `frontend/app/(dashboard)/sign-requests/[id]/editor/page.tsx`
- Database: check if there are duplicate/deleted fields

**Fix Plan**:
- [ ] Check database for duplicate fields
- [ ] Fix saveFields() to delete old fields before creating new ones
- [ ] Or use upsert logic instead of delete+create

---

### 5. ❌ Sau khi ký, màn hình xem file cần hiển thị file đã có chữ ký
**Problem**: After signing, viewing the document still shows original PDF without signatures

**Root Cause**:
- Document viewer uses original file_path instead of signed_file_path
- signed_file_path not updated in database
- Frontend doesn't check for signed version

**Files to Check**:
- `frontend/app/(dashboard)/documents/[id]/page.tsx`
- `frontend/app/(dashboard)/sign-requests/[id]/page.tsx`
- `backend/src/modules/documents/documents.controller.ts` (view/download endpoints)

**Fix Plan**:
- [ ] Update document.signed_file_path after signing completes
- [ ] Frontend should prefer signed_file_path over file_path
- [ ] Add logic to check if document has been signed

---

## Priority Order

1. **HIGH**: Issue #3 - File tải về không có chữ ký (core functionality)
2. **HIGH**: Issue #4 - Field count sai (data integrity)
3. **MEDIUM**: Issue #5 - Hiển thị file đã ký (UX)
4. **MEDIUM**: Issue #1 - Notification (UX)
5. **LOW**: Issue #2 - Dialog nhấp nháy (minor UX issue)

## Testing Plan

After fixes:
1. Create new sign request with 4 fields
2. Send to internal signer
3. Verify notification received
4. Sign without dialog flickering
5. Download and verify signatures appear
6. Check field count is correct
7. View document and see signed version
