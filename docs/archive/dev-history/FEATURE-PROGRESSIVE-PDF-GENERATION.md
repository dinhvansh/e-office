# Feature: Progressive PDF Generation with Watermark

## Yêu Cầu

### 1. Tạo PDF Sau Mỗi Lần Ký
- Mỗi khi 1 người ký xong → Tạo/cập nhật PDF ngay lập tức
- Không đợi tất cả người ký xong
- Đè file cũ (cùng 1 file path)

### 2. Không Có Audit Trail Trong Quá Trình
- Chỉ có chữ ký + fields đã điền
- KHÔNG thêm trang audit trail
- Audit trail chỉ thêm khi hoàn thành 100%

### 3. Watermark "CHƯA HOÀN THÀNH"
- Khi status != 'completed'
- Hiển thị watermark chéo giữa trang
- Text: "CHƯA HOÀN THÀNH" hoặc "DRAFT - NOT FINALIZED"
- Màu đỏ nhạt, opacity thấp

### 4. File Path Strategy
- **In Progress**: `storage/{tenant}/signing_{timestamp}_{docId}.pdf`
- **Completed**: Rename to `storage/{tenant}/signed_{timestamp}_{docId}.pdf`
- Update `document.signed_file_path` mỗi lần

## Implementation Plan

### Phase 1: Update PDF Generation Service

**File**: `backend/src/modules/signRequests/pdfGeneration.service.ts`

```typescript
async generateProgressivePdf(
  signRequestId: number, 
  includeAuditTrail: boolean = false
): Promise<string> {
  // 1. Load data
  // 2. Load original PDF
  // 3. Draw signatures (only signed ones)
  // 4. Add watermark if not completed
  // 5. Add audit trail only if includeAuditTrail = true
  // 6. Save to signing_xxx.pdf or signed_xxx.pdf
}

private async addWatermark(
  pdfDoc: PDFDocument,
  text: string = 'CHUA HOAN THANH'
): Promise<void> {
  // Add diagonal watermark to all pages
}
```

### Phase 2: Update Signing Logic

**File**: `backend/src/modules/signers/signers.service.ts`

```typescript
async signInternal(signerId: number, positionData: any) {
  // ... existing code ...
  
  // ✅ Generate PDF after each signature
  const signedPdfPath = await pdfGenerationService.generateProgressivePdf(
    signer.sign_request_id,
    false // No audit trail yet
  );
  
  // Update document
  await prisma.documents.update({
    where: { id: signRequest.document_id },
    data: { signed_file_path: signedPdfPath }
  });
  
  // If all signed, regenerate with audit trail
  if (allSigned) {
    const finalPdfPath = await pdfGenerationService.generateProgressivePdf(
      signer.sign_request_id,
      true // Include audit trail
    );
    
    await prisma.documents.update({
      where: { id: signRequest.document_id },
      data: { 
        signed_file_path: finalPdfPath,
        status: 'completed'
      }
    });
  }
}
```

### Phase 3: Update View/Download Endpoints

**File**: `backend/src/modules/documents/documents.controller.ts`

```typescript
view = async (req: Request, res: Response): Promise<void> => {
  const document = await documentsService.getDocument(...);
  
  // Always use signed_file_path if exists (even if not completed)
  const filePath = document.signed_file_path || document.file_path;
  
  // ... send file ...
}

download = async (req: Request, res: Response): Promise<void> => {
  // Same logic as view
}
```

## Benefits

### 1. Real-time Progress
- User có thể xem PDF với chữ ký đã có ngay lập tức
- Không cần đợi tất cả người ký xong

### 2. Clear Status
- Watermark rõ ràng cho biết document chưa hoàn thành
- Tránh nhầm lẫn

### 3. Single File
- Không tạo nhiều file
- Dễ quản lý storage

### 4. Audit Trail Only When Done
- Giảm kích thước file trong quá trình ký
- Audit trail chỉ có ý nghĩa khi hoàn thành

## Technical Details

### Watermark Implementation

```typescript
private async addWatermark(
  pdfDoc: PDFDocument,
  text: string = 'CHUA HOAN THANH'
): Promise<void> {
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  for (const page of pages) {
    const { width, height } = page.getSize();
    
    // Draw diagonal text
    page.drawText(text, {
      x: width / 2 - 150,
      y: height / 2,
      size: 60,
      font: font,
      color: rgb(1, 0, 0),
      opacity: 0.2,
      rotate: degrees(-45),
    });
  }
}
```

### File Naming Strategy

```typescript
private getSignedFilePath(document: any, isCompleted: boolean): string {
  const timestamp = Date.now();
  const prefix = isCompleted ? 'signed' : 'signing';
  const fileName = `${prefix}_${timestamp}_${document.id}.pdf`;
  return path.join('storage', document.tenant_id.toString(), fileName);
}
```

## Migration Plan

### Step 1: Add New Method
- Add `generateProgressivePdf()` alongside existing `generateSignedPdf()`
- Keep old method for backward compatibility

### Step 2: Update Signing Flow
- Update `signInternal()` to call new method
- Update `signExternal()` to call new method

### Step 3: Test
- Test with sequential signing
- Test with parallel signing
- Test watermark display
- Test final PDF with audit trail

### Step 4: Cleanup
- Remove old `generateSignedPdf()` if not needed
- Update all references

## Testing Checklist

- [ ] Create sign request with 3 signers
- [ ] Signer 1 signs → PDF has 1 signature + watermark
- [ ] Signer 2 signs → PDF has 2 signatures + watermark
- [ ] Signer 3 signs → PDF has 3 signatures + audit trail, no watermark
- [ ] Download before completion → Has watermark
- [ ] Download after completion → No watermark, has audit trail
- [ ] View in browser → Same behavior as download
- [ ] File path updated correctly in database
- [ ] Old file deleted/overwritten

## Notes

- Watermark text có thể config trong settings
- Có thể thêm timestamp vào watermark
- Có thể thêm "X/Y signed" vào watermark
- Consider adding page numbers to audit trail
