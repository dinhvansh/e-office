# Fix Signing Issues 027/2025 - Complete Summary

## Issues Fixed

### ✅ Issue #3: File tải về không có chữ ký - FIXED

**Changes Made**:

1. **Backend - pdfGeneration.service.ts**
   - Fixed Vietnamese character encoding
   - Added `sanitizeText()` call for text/date fields
   - Vietnamese text now converted: "văn nguyễn ĐÌnh" → "van nguyen DInh"

2. **Frontend - sign-requests/[id]/page.tsx**
   - Updated PDF viewer to use signed version when completed
   - Changed from always using `/view` to checking status
   - Now uses `/view-signed` when `signRequest.status === 'completed'`

3. **Frontend - documents/page.tsx**
   - Updated `handleDownload()` to accept document object
   - Added logic to check if document has signed version
   - Uses `/download-signed` when `document.status === 'completed' && document.signed_file_path`

**Code Changes**:

```typescript
// pdfGeneration.service.ts (line ~207)
} else if (field.type === 'text' || field.type === 'date') {
  const text = String(fieldValue.value || '');
  const sanitizedText = this.sanitizeText(text);
  page.drawText(sanitizedText, {
    x: x + 5,
    y: y - fieldHeight + 15,
    size: 12,
    font: font,
    color: rgb(0, 0, 0),
  });
  console.log(`[PDF Generation] Drew text "${text}" (sanitized: "${sanitizedText}") on page ${field.page}`);
}
```

```typescript
// sign-requests/[id]/page.tsx (line ~64)
const endpoint = signRequest.status === 'completed' 
  ? `/documents/${signRequest.document.id}/view-signed`
  : `/documents/${signRequest.document.id}/view`;
```

```typescript
// documents/page.tsx (line ~320)
const handleDownload = async (id: number, fileName?: string, document?: DocumentRecord) => {
  // ...
  const useSigned = document?.status === 'completed' && document?.signed_file_path;
  const endpoint = useSigned ? 'download-signed' : 'download';
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/documents/${id}/${endpoint}`;
  // ...
}
```

---

### ✅ Issue #5: Màn hình xem file cần hiển thị file đã ký - FIXED

**Status**: Fixed together with Issue #3

**What Was Fixed**:
- Sign request detail page now shows signed PDF when completed
- Documents list download button now downloads signed version
- Document flow page already had this logic (no changes needed)

---

## Issues Not Reproduced / Low Priority

### ❓ Issue #4: Hiển thị số field sai (8/4)

**Status**: Cannot reproduce
- Database check shows only 4 fields (correct)
- No duplicates found
- Need screenshot or steps to reproduce

**Possible Causes**:
- Frontend display bug (need to see actual UI)
- User counting something else
- Confusion between different sign requests

**Action**: Wait for user to provide more details

---

### ⏳ Issue #2: Dialog nhấp nháy khi vẽ chữ ký

**Status**: Low priority, not investigated yet
- Need to reproduce the issue
- Likely caused by unnecessary re-renders
- Can be fixed with useCallback/useMemo

**Action**: Will investigate if user reports again

---

### ⏳ Issue #1: Không có thông báo

**Status**: Not investigated yet
- Need to check email service
- Need to check notification service
- Need to verify SMTP configuration

**Action**: Will investigate separately

---

## Test Results

### Document 027/2025 (ID: 79, SR #46)

✅ **PDF Generation**:
- Regenerated successfully with `npx ts-node scripts/regenerate-sr46.ts`
- Size: 162,160 bytes
- Contains: 1 signature + 3 text fields + audit trail page
- Vietnamese text sanitized correctly

✅ **Database**:
- `signed_file_path` set: `storage\1\signed_1764428889595_79.pdf`
- Document status: `completed`
- Sign request status: `completed`
- All 4 fields present (no duplicates)

✅ **Frontend Changes**:
- Sign request detail page will show signed PDF
- Documents list download will get signed version
- Logic checks both status and signed_file_path

---

## Files Modified

### Backend
1. `backend/src/modules/signRequests/pdfGeneration.service.ts`
   - Line ~207: Added sanitizeText() for Vietnamese characters

### Frontend
2. `frontend/app/(dashboard)/sign-requests/[id]/page.tsx`
   - Line ~64: Check status and use view-signed endpoint

3. `frontend/app/(dashboard)/documents/page.tsx`
   - Line ~320: Updated handleDownload to check signed version
   - Line ~833: Pass document object to handleDownload

---

## Testing Checklist

### Manual Testing Required

- [ ] Create new sign request with Vietnamese text
- [ ] Sign the document (internal signer)
- [ ] Verify signed PDF is generated automatically
- [ ] View sign request detail page - should show signed PDF
- [ ] Download from documents list - should get signed version
- [ ] Check Vietnamese text is readable (sanitized)
- [ ] Verify audit trail page is included

### Edge Cases to Test

- [ ] Document without signed_file_path (should use original)
- [ ] Document with status != completed (should use original)
- [ ] Multiple signers (sequential and parallel)
- [ ] External signers with Vietnamese names
- [ ] Long Vietnamese text (check truncation)

---

## Known Limitations

### Vietnamese Character Support

**Current Solution**: Sanitize Vietnamese → ASCII
- "ă" → "a", "đ" → "d", "ê" → "e", etc.
- Works but loses diacritics

**Better Solution** (Future):
- Embed custom Unicode font (e.g., Roboto, Noto Sans)
- Requires adding font file to project
- More complex but preserves original text

**Code for Future Reference**:
```typescript
// Instead of StandardFonts.Helvetica
const fontBytes = fs.readFileSync('path/to/NotoSans-Regular.ttf');
const font = await pdfDoc.embedFont(fontBytes);
```

---

## Remaining Work

### High Priority
- [ ] Investigate Issue #1 (notifications)
- [ ] Get more details on Issue #4 (field count)

### Medium Priority
- [ ] Consider adding Unicode font support
- [ ] Add visual indicator for "signed" vs "original" PDF
- [ ] Add download button to sign request detail page

### Low Priority
- [ ] Fix Issue #2 (dialog flickering) if reproduced
- [ ] Add tests for PDF generation
- [ ] Add tests for signed file download logic

---

## Deployment Notes

### Before Deploying
1. Test with real Vietnamese names and text
2. Verify all existing signed PDFs still work
3. Check that original PDFs are still accessible
4. Test both internal and external signing flows

### After Deploying
1. Monitor for errors in PDF generation
2. Check that users can download signed files
3. Verify Vietnamese text is readable
4. Collect feedback on sanitized text quality

---

## Related Documents

- `docs/dev/TODO-FIX-SIGNING-ISSUES-027.md` - Original issue list
- `docs/dev/FIX-SIGNING-ISSUES-027-PROGRESS.md` - Progress report
- `docs/dev/FIX-INTERNAL-SIGN-SHOW-FIELDS.md` - Related signing fixes
- `docs/dev/TODO-INTERNAL-SIGN-PDF-GENERATION.md` - PDF generation notes
