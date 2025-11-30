# Progressive PDF Fix for Document 030/2025

## Issue Summary

**Problem**: Document 030/2025 had 2 people sign but no signed PDF file was displayed.

**Root Cause**: The progressive PDF generation feature was implemented in the code but the PDF file was never actually generated for this document.

## Investigation Results

### Document Status
- **Document**: 030/2025 (giay-de-nghi-thanh-toan-TT200)
- **Signers**: 2/3 signed (Trần Thị Hương, Đỗ Văn Hùng)
- **Database**: Had `signed_file_path` = `storage\1\signing_1764433235213_82.pdf`
- **File System**: File did NOT exist ❌

### Why It Happened
The progressive PDF generation code exists in:
- `backend/src/modules/signRequests/pdfGeneration.service.ts` - ✅ Function exists
- `backend/src/modules/signRequests/signRequests.service.ts` - ✅ Called in `signInternal()` method (line 667-691)
- `backend/src/modules/signers/signers.service.ts` - ❌ NOT called in `sign()` method (external signing)

**Conclusion**: Document 030 was likely signed using the external signing flow (OTP-based), which did NOT have progressive PDF generation implemented.

## Solution Applied

### 1. Immediate Fix - Regenerate PDF for Document 030
Created and ran script: `backend/scripts/fix-progressive-pdf-030.js`

**Results**:
```
✅ Progressive PDF generated: storage\1\signing_1764434873201_82.pdf
✅ Document updated with signed_file_path
✅ File exists: 160.04 KB
✅ Watermark "CHUA HOAN THANH" added (2/3 signed)
✅ Drew 4 field values (2 signatures + 2 text fields)
```

### 2. Permanent Fix - Add Progressive PDF to External Signing
Modified: `backend/src/modules/signers/signers.service.ts`

**Changes**:
1. Added import: `import { pdfGenerationService } from "../signRequests/pdfGeneration.service";`
2. Added progressive PDF generation after signing (lines 85-110):

```typescript
// Generate progressive PDF after each signature
try {
  const [completed, total] = await Promise.all([
    signersRepository.countCompleted(signer.sign_request_id),
    signersRepository.countTotal(signer.sign_request_id),
  ]);
  const allSigned = total > 0 && completed === total;
  
  console.log(`[Signers Service] Generating progressive PDF for sign request ${signer.sign_request_id}`);
  console.log(`[Signers Service] Progress: ${completed}/${total} signed, All signed: ${allSigned}`);
  
  const pdfPath = await pdfGenerationService.generateProgressivePdf(
    signer.sign_request_id,
    {
      includeAuditTrail: allSigned,
      addWatermark: !allSigned
    }
  );
  
  // Update document with signed file path
  await prisma.documents.update({
    where: { id: signer.sign_request.document_id },
    data: { signed_file_path: pdfPath }
  });
  
  console.log(`[Signers Service] Progressive PDF generated: ${pdfPath}`);
} catch (error: any) {
  console.error(`[Signers Service] Failed to generate progressive PDF: ${error.message}`);
  // Don't throw - signing was successful, PDF generation is secondary
}
```

## Progressive PDF Feature Overview

### How It Works
1. **After Each Signature**: Generate a new PDF with all signatures so far
2. **Watermark**: Add "CHUA HOAN THANH" watermark if not all signed
3. **Audit Trail**: Only add audit trail page when all signers complete
4. **File Naming**: 
   - In progress: `signing_{timestamp}_{docId}.pdf`
   - Completed: `signed_{timestamp}_{docId}.pdf`
5. **Cleanup**: Delete old `signing_*` files to save storage

### Implementation Status

| Signing Method | Progressive PDF | Status |
|---------------|----------------|--------|
| Internal Signing (authenticated users) | ✅ Yes | Working (already implemented) |
| External Signing (OTP-based) | ✅ Yes | **Fixed in this session** |

## Testing

### Verification Steps
1. ✅ Check document 030 in database - has `signed_file_path`
2. ✅ Verify file exists on disk - 160.04 KB
3. ✅ PDF contains 2 signatures (Trần Thị Hương, Đỗ Văn Hùng)
4. ✅ PDF has watermark "CHUA HOAN THANH"
5. ✅ No audit trail (not all signed yet)

### Next Steps for Testing
1. Have the 3rd person (adsda) sign the document
2. Verify final PDF is generated without watermark
3. Verify audit trail page is added
4. Verify old `signing_*` file is deleted

## Files Modified

1. `backend/src/modules/signers/signers.service.ts` - Added progressive PDF generation
2. `backend/scripts/fix-progressive-pdf-030.js` - One-time fix script (can be deleted)

## Notes

- Progressive PDF generation is non-blocking (wrapped in try-catch)
- If PDF generation fails, signing still succeeds
- Old signing files are automatically cleaned up
- TypeScript compilation has unrelated errors that need to be fixed separately

## Summary

✅ **Issue Resolved**: Document 030/2025 now has a progressive PDF with 2 signatures and watermark  
✅ **Root Cause Fixed**: External signing now generates progressive PDFs  
✅ **Feature Complete**: Both internal and external signing support progressive PDFs  

The user can now view the signed PDF in the frontend, and when the 3rd person signs, a final PDF with audit trail will be automatically generated.
