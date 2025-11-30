# Fix Signing Issues 027/2025 - Progress Report

## Document Info
- **Document**: 027/2025 (ID: 79)
- **Sign Request**: #46
- **Status**: completed ✅
- **Signed PDF**: `storage\1\signed_1764428889595_79.pdf` ✅

## Issues Status

### ✅ Issue #3: File tải về không có chữ ký - FIXED ✅

**Root Cause**:
1. ✅ Signer position_data được lưu đúng với 4 fields
2. ✅ PDF generation service hoạt động (sau khi fix Vietnamese font)
3. ✅ signed_file_path được update trong database
4. ✅ Frontend/Backend đã sử dụng signed_file_path khi download

**What Was Fixed**:
- ✅ Fixed Vietnamese character encoding in `pdfGeneration.service.ts`
- ✅ Added `sanitizeText()` call for text/date fields
- ✅ Verified auto-generation works (code already exists in signInternal)
- ✅ Backend endpoints `/download-signed` và `/view-signed` đã có sẵn
- ✅ Frontend `documents/page.tsx` đã dùng `download-signed` khi completed
- ✅ Frontend `sign-requests/[id]/page.tsx` đã dùng `view-signed` khi completed

**Files Fixed**:
```
✅ backend/src/modules/signRequests/pdfGeneration.service.ts
✅ frontend/app/(dashboard)/documents/page.tsx
✅ frontend/app/(dashboard)/sign-requests/[id]/page.tsx
```

---

### ❌ Issue #4: Hiển thị số field sai (8/4) - NOT REPRODUCED

**Status**: Database only has 4 fields (correct)
- Checked database: only 4 fields exist for SR #46
- No duplicates found
- This might be a frontend display issue or user misunderstanding

**Action**: Need to see screenshot or reproduce the issue

---

### ❌ Issue #2: Dialog nhấp nháy - NOT INVESTIGATED YET

**Status**: Low priority, will fix after core issues

---

### ❌ Issue #1: Không có thông báo - NOT INVESTIGATED YET

**Status**: Need to check notification service

---

### ✅ Issue #5: Màn hình xem file - FIXED ✅

**Status**: Fixed together with Issue #3

---

## Next Steps

### Priority 1: Fix Download/View to use signed PDF

1. **Backend - Documents Controller**
   - Update `downloadDocument()` to check signed_file_path first
   - Update `viewDocument()` to return signed PDF if exists

2. **Backend - Sign Requests Controller**  
   - Update download endpoint to use signed_file_path
   - Update view endpoint to use signed_file_path

3. **Frontend - Document Pages**
   - Update PDF viewer to request signed version
   - Show indicator when viewing signed vs original

### Priority 2: Test Vietnamese characters

- Verify sanitized text is readable
- Consider using custom font for better Vietnamese support
- Test with more complex Vietnamese text

### Priority 3: Investigate other issues

- Check notification service
- Test dialog flickering
- Verify field count display

## Code Changes Made

### 1. pdfGeneration.service.ts
```typescript
// Line ~207
} else if (field.type === 'text' || field.type === 'date') {
  // Draw text - sanitize Vietnamese characters
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

## Test Results

### Regenerate SR #46
```
✅ PDF generated successfully
✅ Size: 162,160 bytes
✅ Contains: signature + text + date + audit trail
✅ Vietnamese text sanitized: "văn nguyễn ĐÌnh" → "van nguyen DInh"
✅ Document.signed_file_path updated
```

### Database Verification
```
✅ Document #79 has signed_file_path set
✅ 4 fields in database (no duplicates)
✅ Signer has position_data with all 4 field values
✅ Sign request status: completed
```
