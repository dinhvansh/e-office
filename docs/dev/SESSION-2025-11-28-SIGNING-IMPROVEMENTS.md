# Session 2025-11-28: Signing Flow Improvements

## Summary
Improved external signing flow with OTP verification, resend functionality, and automatic signed PDF generation.

## Features Implemented

### 1. Custom Order Input for Workflow
**File:** `frontend/components/workflow/WorkflowCustomizer.tsx`
- Added editable order input fields in "Tùy chỉnh" (Custom) mode
- Users can now input custom signing order numbers instead of fixed display

### 2. Fix Resend Sign Request Logic
**Files:** 
- `backend/src/modules/signRequests/signRequests.service.ts`

**Changes:**
- Fixed `sendSignRequest` to allow resending emails
- Changed logic to only block `completed` and `cancelled` statuses
- Allow resend for `pending`, `sent`, `in_progress` statuses
- Auto-generates missing tokens during resend
- Removed `token_expires_at` field (not in schema)

**Before:**
```typescript
if (signRequest.status !== "draft") {
  throw ApiError.badRequest("Cannot send");
}
```

**After:**
```typescript
if (signRequest.status === "completed" || signRequest.status === "cancelled") {
  throw ApiError.badRequest("Cannot send");
}
```

### 3. OTP Verification Flow
**Files:**
- `backend/src/modules/public/publicSign.routes.ts`
- `backend/src/modules/public/publicSign.controller.ts`
- `frontend/app/sign/[token]/page.tsx`

**Backend Changes:**
- Added `POST /public/sign/:token/verify-otp` endpoint
- Verifies OTP with bcrypt before allowing signing
- Returns specific error codes:
  - `INVALID_OTP` - Wrong OTP
  - `OTP_EXPIRED` - Expired (10 minutes)
  - `OTP_NOT_ISSUED` - No OTP generated yet

**Frontend Changes:**
- Added "Xác thực OTP" button
- OTP must be verified before showing signing options
- Clear error messages for each error type
- Disable OTP input after successful verification
- Reset verification when OTP changes

**User Flow:**
1. Receive email with OTP
2. Click signing link
3. Enter OTP (6 digits)
4. Click "Xác thực OTP"
5. See success message
6. Choose signing mode (Guided/Modal)
7. Sign document
8. Submit

### 4. Automatic Signed PDF Generation
**Files:**
- `backend/src/modules/public/publicSign.controller.ts`
- `backend/prisma/schema.prisma`

**Schema Changes:**
```prisma
model documents {
  ...
  file_path          String
  original_file_name String?
  signed_file_path   String?  // NEW
  ...
}
```

**Logic:**
- After all signers complete, automatically generate signed PDF
- Embed all signatures and field values into PDF
- Save to `storage/{tenant_id}/signed_{timestamp}_{doc_id}.pdf`
- Update `documents.signed_file_path` in database
- Add signature info at bottom of last page

**Implementation:**
```typescript
if (allSigned) {
  // Generate signed PDF
  const signedPdfBuffer = await pdfSigningService.generateSignedPdf(signRequestId);
  
  // Save to storage
  const signedFilePath = path.join('storage', tenantId, signedFileName);
  fs.writeFileSync(signedFilePath, signedPdfBuffer);
  
  // Update document
  await prisma.documents.update({
    where: { id: documentId },
    data: { 
      status: 'completed',
      signed_file_path: signedFilePath
    }
  });
}
```

### 5. Email Enhancements
**Files:**
- `backend/src/modules/common/email.service.ts`
- `frontend/components/signing/ThankYouPage.tsx`

**Changes:**
- Added `documentNumber` parameter to email templates
- Display document number in emails and thank you page
- Improved email styling with document info box

## Scripts Created

### Testing & Debugging
- `backend/scripts/test-resend-logic.js` - Test resend functionality
- `backend/scripts/check-document-133.js` - Check document status
- `backend/scripts/generate-signed-pdf-015-2025.js` - Generate signed PDF for existing document

## Database Changes

### Migration
```bash
npx prisma db push
```

### Schema Updates
- Added `signed_file_path` field to `documents` table

## Testing

### Test Case 1: OTP Verification
1. ✅ Valid OTP → Success, show signing options
2. ✅ Invalid OTP → Error "Mã OTP không đúng"
3. ✅ Expired OTP → Error "Mã OTP đã hết hạn"
4. ✅ No OTP → Error "Chưa có mã OTP"

### Test Case 2: Resend Sign Request
1. ✅ Draft → Can send
2. ✅ Pending → Can resend
3. ✅ In Progress → Can resend
4. ❌ Completed → Cannot resend
5. ❌ Cancelled → Cannot resend

### Test Case 3: Signed PDF Generation
1. ✅ All signers complete → PDF auto-generated
2. ✅ Signatures embedded in PDF
3. ✅ Field values rendered correctly
4. ✅ Signature info added at bottom
5. ✅ `signed_file_path` updated in database

## Files Modified

### Backend
- `backend/src/modules/signRequests/signRequests.service.ts`
- `backend/src/modules/public/publicSign.routes.ts`
- `backend/src/modules/public/publicSign.controller.ts`
- `backend/src/modules/common/email.service.ts`
- `backend/prisma/schema.prisma`

### Frontend
- `frontend/app/sign/[token]/page.tsx`
- `frontend/components/workflow/WorkflowCustomizer.tsx`
- `frontend/components/signing/ThankYouPage.tsx`

### Documentation
- `docs/dev/FEATURE-RESEND-SIGN-REQUEST.md`
- `docs/dev/FIX-EXTERNAL-SIGNING-OTP-FLOW.md`

## Known Issues & Future Work

### Current Limitations
- Signed PDF generation only works for new documents (after restart)
- Existing documents need manual PDF generation via script

### Future Enhancements
- [ ] Add "Download Signed PDF" button in Flow page
- [ ] Add "Resend" button in Sign Requests UI
- [ ] Track resend count and last resend time
- [ ] Add rate limiting for resend
- [ ] Email notification after successful resend
- [ ] Batch PDF generation for existing documents

## Deployment Notes

1. **Database Migration:**
   ```bash
   cd backend
   npx prisma db push
   ```

2. **Restart Backend:**
   - Required for new code to take effect
   - Signed PDF generation will work for new sign requests

3. **Existing Documents:**
   - Use `generate-signed-pdf-015-2025.js` script
   - Or wait for next signing to trigger generation

## Success Metrics
- ✅ External signers can verify OTP before signing
- ✅ Clear error messages for OTP issues
- ✅ Resend functionality works for all valid statuses
- ✅ Signed PDFs auto-generated after completion
- ✅ Document number displayed in emails and thank you page

## Related Documents
- [FEATURE-RESEND-SIGN-REQUEST.md](./FEATURE-RESEND-SIGN-REQUEST.md)
- [FIX-EXTERNAL-SIGNING-OTP-FLOW.md](./FIX-EXTERNAL-SIGNING-OTP-FLOW.md)
- [SESSION-2025-11-28-SEQUENTIAL-APPROVAL-COMPLETE.md](./SESSION-2025-11-28-SEQUENTIAL-APPROVAL-COMPLETE.md)
