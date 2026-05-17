# Phân Tích: Progressive PDF Generation

## Yêu Cầu Gốc

1. **Mỗi lần 1 người ký xong** → Tạo/cập nhật PDF ngay
2. **Không có audit trail** trong quá trình ký
3. **Đè file cũ** (cùng 1 file path)
4. **Watermark "CHƯA HOÀN THÀNH"** khi chưa hoàn thành

---

## ✅ Đánh Giá Khả Thi

### 1. Tạo PDF Sau Mỗi Lần Ký - ✅ KHẢ THI

**Hiện tại:**
- PDF chỉ tạo 1 lần khi tất cả ký xong
- Code trong `signers.service.ts` → `signInternal()`

**Cần làm:**
```typescript
// signers.service.ts - signInternal()
async signInternal(signerId: number, positionData: any) {
  // ... save signature ...
  
  // ✅ Generate PDF immediately after each signature
  await pdfGenerationService.generateProgressivePdf(
    signer.sign_request_id,
    false // no audit trail
  );
}
```

**Độ khó:** ⭐ Dễ - Chỉ cần gọi thêm 1 function

---

### 2. Không Có Audit Trail - ✅ KHẢ THI

**Hiện tại:**
- `generateSignedPdf()` luôn thêm audit trail

**Cần làm:**
```typescript
async generateProgressivePdf(
  signRequestId: number,
  includeAuditTrail: boolean = false
) {
  // ... draw signatures ...
  
  if (includeAuditTrail) {
    await this.createAuditTrailPage(pdfDoc, signRequest);
  }
}
```

**Độ khó:** ⭐ Dễ - Thêm parameter boolean

---

### 3. Đè File Cũ - ⚠️ CÓ VẤN ĐỀ

**Vấn đề:**

#### A. Race Condition
```
Người A ký → Tạo PDF (5s)
Người B ký → Tạo PDF (5s) ← Đè file của A?
```

**Giải pháp:**
- Dùng file locking
- Hoặc queue system
- Hoặc unique filename với timestamp

#### B. File Path Strategy

**Option 1: Cùng 1 file (như yêu cầu)**
```
storage/1/signing_79.pdf  ← Luôn cùng tên
```
❌ **Vấn đề:** 
- Race condition khi 2 người ký cùng lúc
- Mất history nếu có lỗi
- Không rollback được

**Option 2: File mới mỗi lần (khuyến nghị)**
```
storage/1/signing_79_v1.pdf  ← Người 1 ký
storage/1/signing_79_v2.pdf  ← Người 2 ký
storage/1/signed_79.pdf      ← Hoàn thành
```
✅ **Ưu điểm:**
- Không race condition
- Có history
- Có thể rollback
- Chỉ cần update `document.signed_file_path`

**Option 3: Timestamp (khuyến nghị nhất)**
```
storage/1/signing_1732900000_79.pdf  ← Update mỗi lần
storage/1/signed_1732900500_79.pdf   ← Hoàn thành
```
✅ **Ưu điểm:**
- Unique filename
- Tự động cleanup file cũ
- Đơn giản nhất

**Độ khó:** ⭐⭐ Trung bình - Cần xử lý concurrency

---

### 4. Watermark - ✅ KHẢ THI

**Code:**
```typescript
private async addWatermark(pdfDoc: PDFDocument): Promise<void> {
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  for (const page of pages) {
    const { width, height } = page.getSize();
    
    page.drawText('CHUA HOAN THANH', {
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

**Độ khó:** ⭐ Dễ - pdf-lib hỗ trợ sẵn

---

## 🎯 Khuyến Nghị Implementation

### Approach 1: Simple (Khuyến nghị cho MVP)

**File Strategy:**
```
storage/1/signing_{timestamp}_{docId}.pdf  ← Update mỗi lần
storage/1/signed_{timestamp}_{docId}.pdf   ← Hoàn thành
```

**Flow:**
```
1. Người A ký
   → Tạo signing_1732900000_79.pdf
   → Update document.signed_file_path
   → Có watermark

2. Người B ký  
   → Tạo signing_1732900100_79.pdf (file mới)
   → Update document.signed_file_path (đè path cũ)
   → Có watermark
   → Xóa file cũ (optional)

3. Người C ký (cuối cùng)
   → Tạo signed_1732900200_79.pdf
   → Update document.signed_file_path
   → KHÔNG có watermark
   → CÓ audit trail
   → Xóa file signing cũ
```

**Ưu điểm:**
- ✅ Đơn giản
- ✅ Không race condition
- ✅ Tự động cleanup
- ✅ User luôn thấy PDF mới nhất

**Nhược điểm:**
- ❌ Tạo nhiều file tạm
- ❌ Tốn storage (nhưng cleanup được)

---

### Approach 2: Queue-based (Cho production)

**File Strategy:**
```
storage/1/signing_79.pdf  ← Cùng 1 file
```

**Flow:**
```
1. Người A ký → Add to queue
2. Worker process queue → Generate PDF
3. Người B ký → Add to queue (đợi A xong)
4. Worker process → Generate PDF
```

**Ưu điểm:**
- ✅ Cùng 1 file như yêu cầu
- ✅ Không race condition
- ✅ Scalable

**Nhược điểm:**
- ❌ Phức tạp (cần Redis/Bull)
- ❌ Delay (phải đợi queue)
- ❌ Overkill cho use case này

---

## 📊 So Sánh

| Feature | Approach 1 (Simple) | Approach 2 (Queue) | Current |
|---------|--------------------|--------------------|---------|
| Complexity | ⭐ Low | ⭐⭐⭐ High | ⭐⭐ Medium |
| Race Condition | ✅ No | ✅ No | ✅ No |
| Storage | ⚠️ More files | ✅ 1 file | ✅ 1 file |
| Delay | ✅ Instant | ⚠️ Queue delay | ✅ Instant |
| Rollback | ✅ Yes | ❌ No | ❌ No |
| Dev Time | 2-3 hours | 1-2 days | - |

---

## 💡 Quyết Định

### Khuyến nghị: **Approach 1 (Simple)**

**Lý do:**
1. ✅ Đáp ứng đủ yêu cầu
2. ✅ Đơn giản, dễ maintain
3. ✅ Không cần infrastructure mới
4. ✅ Có thể cleanup file cũ tự động
5. ✅ User experience tốt (instant)

**Trade-off chấp nhận được:**
- Tạo nhiều file tạm → Cleanup tự động
- Không đúng 100% "cùng 1 file" → Nhưng user không thấy khác biệt

---

## 🔧 Implementation Plan

### Phase 1: Core Logic (1-2 hours)

**File:** `pdfGeneration.service.ts`

```typescript
async generateProgressivePdf(
  signRequestId: number,
  options: {
    includeAuditTrail?: boolean;
    addWatermark?: boolean;
  } = {}
): Promise<string> {
  // 1. Load data
  const signRequest = await this.loadSignRequest(signRequestId);
  
  // 2. Load original PDF
  const pdfDoc = await this.loadOriginalPdf(signRequest.document);
  
  // 3. Draw signatures (only signed ones)
  await this.drawSignatures(pdfDoc, signRequest);
  
  // 4. Add watermark if needed
  if (options.addWatermark) {
    await this.addWatermark(pdfDoc);
  }
  
  // 5. Add audit trail if needed
  if (options.includeAuditTrail) {
    await this.createAuditTrailPage(pdfDoc, signRequest);
  }
  
  // 6. Save with appropriate filename
  const filePath = this.getFilePath(signRequest, options.includeAuditTrail);
  await this.savePdf(pdfDoc, filePath);
  
  // 7. Cleanup old files
  await this.cleanupOldFiles(signRequest.document_id);
  
  return filePath;
}

private getFilePath(signRequest: any, isCompleted: boolean): string {
  const timestamp = Date.now();
  const prefix = isCompleted ? 'signed' : 'signing';
  return `storage/${signRequest.document.tenant_id}/${prefix}_${timestamp}_${signRequest.document_id}.pdf`;
}

private async cleanupOldFiles(documentId: number): Promise<void> {
  // Delete old signing_* files for this document
  // Keep only the latest one
}
```

### Phase 2: Update Signing Logic (30 min)

**File:** `signers.service.ts`

```typescript
async signInternal(signerId: number, positionData: any) {
  // ... existing code ...
  
  // Check if all signed
  const allSigned = await this.checkAllSigned(signer.sign_request_id);
  
  // Generate PDF
  const pdfPath = await pdfGenerationService.generateProgressivePdf(
    signer.sign_request_id,
    {
      includeAuditTrail: allSigned,
      addWatermark: !allSigned
    }
  );
  
  // Update document
  await prisma.documents.update({
    where: { id: signRequest.document_id },
    data: { 
      signed_file_path: pdfPath,
      status: allSigned ? 'completed' : 'in_progress'
    }
  });
}
```

### Phase 3: Update Endpoints (15 min)

**File:** `documents.controller.ts`

```typescript
// No changes needed!
// Already uses signed_file_path if exists
```

### Phase 4: Testing (1 hour)

```
✅ Test sequential signing (3 người ký tuần tự)
✅ Test parallel signing (2 người ký cùng lúc)
✅ Test watermark display
✅ Test audit trail only on completion
✅ Test file cleanup
✅ Test download/view endpoints
```

---

## ⚠️ Potential Issues

### 1. Concurrent Signing

**Scenario:**
```
10:00:00 - User A signs → Start generating PDF
10:00:02 - User B signs → Start generating PDF
10:00:05 - User A PDF done → Update signed_file_path = "signing_100_79.pdf"
10:00:07 - User B PDF done → Update signed_file_path = "signing_107_79.pdf"
```

**Result:** ✅ OK - User B's PDF is newer, has both signatures

**Why it works:**
- Each PDF generation loads fresh data from DB
- User B's PDF will include User A's signature
- Latest file path wins

### 2. Storage Growth

**Problem:** Nhiều file tạm

**Solution:**
```typescript
private async cleanupOldFiles(documentId: number): Promise<void> {
  // Keep only latest 2 files
  // Delete files older than 24 hours
  // Or delete immediately after new file created
}
```

### 3. Performance

**Problem:** Generate PDF mỗi lần ký (có thể chậm)

**Solution:**
- ✅ Acceptable: PDF generation ~1-2s
- ✅ Async: Không block user
- ✅ User có thể tiếp tục làm việc
- 💡 Future: Move to background job nếu cần

---

## 📝 Summary

### ✅ Khả Thi: 100%

**Yêu cầu → Giải pháp:**

1. ✅ Tạo PDF mỗi lần ký → Call `generateProgressivePdf()` trong `signInternal()`
2. ✅ Không audit trail → Parameter `includeAuditTrail: false`
3. ⚠️ Đè file cũ → Dùng timestamp, cleanup tự động (trade-off chấp nhận được)
4. ✅ Watermark → `addWatermark()` method

**Effort:** 3-4 hours total
**Risk:** Low
**Impact:** High (better UX)

### 🎯 Next Steps

1. Review và approve approach
2. Implement Phase 1 (core logic)
3. Implement Phase 2 (signing logic)
4. Test thoroughly
5. Deploy

**Có implement không?** 👍
