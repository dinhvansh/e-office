# Implementation Plan: Approver vs Signer Separation

## 🎯 Objective

Phân biệt rõ ràng giữa **Người phê duyệt (Approver)** và **Người ký (Signer)**:

- **Approver**: Chữ ký CHỈ lưu trong audit log, KHÔNG hiển thị trên PDF cuối cùng
- **Signer**: Chữ ký embed trực tiếp lên PDF cuối cùng, có giá trị pháp lý

---

## 📋 Current State Analysis

### Hiện trạng:
```
✅ Approval workflow exists (document_approvals table)
✅ Signing workflow exists (signers table)
❌ PROBLEM: Both embed signatures into final PDF!
```

### Database Structure:
```typescript
// Approvers (workflow approval)
document_approvals {
  id, document_id, workflow_instance_id, workflow_step_id,
  approver_user_id, action, comment, acted_at,
  signature_data, signature_type  // ← Currently embedded to PDF
}

// Signers (digital signature)
signers {
  id, sign_request_id, email, name, role, signing_order,
  is_internal, user_id, status, signed_at,
  signature_data, signature_type  // ← Should be embedded to PDF
}
```

---

## 🏗️ Implementation Plan

### **Phase 1: Backend - PDF Generation Logic** (1 hour)

#### 1.1 Update PDF Signing Service (30 mins)
**File**: `backend/src/modules/public/pdfSigning.service.ts`

**Changes**:
- ✅ ONLY embed signatures from `signers` table
- ❌ SKIP signatures from `document_approvals` table
- ✅ Add watermark: "Approved by [names]" (text only, no signature image)

**Code Structure**:
```typescript
async generateSignedPDF(signRequestId: number) {
  // 1. Load original PDF
  const pdfDoc = await PDFLib.load(originalPDF);
  
  // 2. Get ONLY signers (not approvers)
  const signers = await getSignersWithSignatures(signRequestId);
  
  // 3. Embed signer signatures to PDF
  for (const signer of signers) {
    if (signer.signature_data) {
      await embedSignatureImage(pdfDoc, signer);
    }
  }
  
  // 4. Add approval watermark (text only)
  const approvals = await getApprovals(documentId);
  if (approvals.length > 0) {
    await addApprovalWatermark(pdfDoc, approvals);
  }
  
  // 5. Add metadata
  await addSigningMetadata(pdfDoc);
  
  return pdfDoc.save();
}
```

#### 1.2 Create Approval History Report (30 mins)
**New File**: `backend/src/modules/approvals/approvalHistory.service.ts`

**Features**:
- Generate separate approval history PDF/HTML
- Include approver signatures in report
- Attach as separate file (not embedded in main PDF)

**API Endpoint**: `GET /api/v1/documents/:id/approval-history`

---

### **Phase 2: Backend - API Updates** (30 mins)

#### 2.1 Download Endpoints
**File**: `backend/src/modules/documents/documents.controller.ts`

**New Endpoints**:
```typescript
// Download signed PDF (only signer signatures)
GET /api/v1/documents/:id/download-signed

// Download approval history (separate file)
GET /api/v1/documents/:id/approval-history

// Download complete package (ZIP: signed PDF + approval history)
GET /api/v1/documents/:id/download-complete
```

#### 2.2 Update Existing Download
**File**: `backend/src/modules/public/publicSign.controller.ts`

**Changes**:
- `GET /public/sign/:token/download-signed` - Only signer signatures
- Add note in response: "Approval signatures in separate file"

---

### **Phase 3: Frontend - UI Updates** (1 hour)

#### 3.1 Approval Detail Page (20 mins)
**File**: `frontend/app/(dashboard)/approvals/[id]/page.tsx`

**Changes**:
- ✅ Keep signature modal for approvers
- ✅ Add note: "Chữ ký của bạn sẽ được lưu trong lịch sử phê duyệt, không hiển thị trên văn bản cuối cùng"
- ✅ Show preview of approval history

#### 3.2 Internal Signing Page (20 mins)
**File**: `frontend/app/(dashboard)/sign-requests/[id]/sign/page.tsx`

**Changes**:
- ✅ Add note: "Chữ ký của bạn sẽ hiển thị trực tiếp trên văn bản PDF cuối cùng"
- ✅ Emphasize legal responsibility
- ✅ Show signature preview on PDF

#### 3.3 Document Download Options (20 mins)
**File**: `frontend/app/(dashboard)/documents/page.tsx`

**New Download Menu**:
```typescript
<DropdownMenu>
  <DropdownMenuItem onClick={downloadSignedPDF}>
    📄 Tải văn bản đã ký (PDF)
  </DropdownMenuItem>
  <DropdownMenuItem onClick={downloadApprovalHistory}>
    📋 Tải lịch sử phê duyệt (PDF)
  </DropdownMenuItem>
  <DropdownMenuItem onClick={downloadComplete}>
    📦 Tải gói hoàn chỉnh (ZIP)
  </DropdownMenuItem>
</DropdownMenu>
```

---

### **Phase 4: Testing** (1 hour)

#### 4.1 Backend Tests (30 mins)
**Test Script**: `backend/scripts/test-approver-vs-signer.js`

**Test Cases**:
1. ✅ Create document with approval workflow
2. ✅ Approver approves with signature
3. ✅ Internal signer signs with signature
4. ✅ Download signed PDF → Verify ONLY signer signature embedded
5. ✅ Download approval history → Verify approver signature in report
6. ✅ Verify PDF structure and metadata

#### 4.2 Frontend Tests (30 mins)
**Manual Test Checklist**:
1. ✅ Approval flow: Sign → Check note → Verify signature saved
2. ✅ Signing flow: Sign → Check note → Verify signature on PDF
3. ✅ Download signed PDF → Open → Verify only signer signatures
4. ✅ Download approval history → Open → Verify approver signatures
5. ✅ Download complete package → Extract → Verify both files

---

## 📊 Implementation Timeline

| Phase | Task | Duration | Status |
|-------|------|----------|--------|
| **Phase 1** | Backend PDF Logic | 1 hour | ⏳ Pending |
| 1.1 | Update PDF Signing Service | 30 mins | ⏳ |
| 1.2 | Create Approval History Report | 30 mins | ⏳ |
| **Phase 2** | Backend API Updates | 30 mins | ⏳ Pending |
| 2.1 | New Download Endpoints | 20 mins | ⏳ |
| 2.2 | Update Existing Download | 10 mins | ⏳ |
| **Phase 3** | Frontend UI Updates | 1 hour | ⏳ Pending |
| 3.1 | Approval Detail Page | 20 mins | ⏳ |
| 3.2 | Internal Signing Page | 20 mins | ⏳ |
| 3.3 | Document Download Options | 20 mins | ⏳ |
| **Phase 4** | Testing | 1 hour | ⏳ Pending |
| 4.1 | Backend Tests | 30 mins | ⏳ |
| 4.2 | Frontend Tests | 30 mins | ⏳ |
| **TOTAL** | | **3.5 hours** | |

---

## 🔄 Complete User Flow

### Flow 1: Document with Approval + Signing

```
1. User uploads document
   ↓
2. Select document type (requires approval + signing)
   ↓
3. System creates workflow + sign request
   ↓
4. APPROVAL PHASE:
   - Approver 1 reviews → Approves with signature
   - Signature saved to document_approvals table
   - Signature NOT embedded to PDF
   ↓
5. SIGNING PHASE:
   - Signer 1 (internal) signs with signature
   - Signature saved to signers table
   - Signature EMBEDDED to PDF
   ↓
6. DOWNLOAD:
   - Option 1: Signed PDF (only signer signatures)
   - Option 2: Approval History (approver signatures)
   - Option 3: Complete Package (both files in ZIP)
```

### Flow 2: Approval Only (No Signing)

```
1. User uploads document
   ↓
2. Select document type (requires approval only)
   ↓
3. APPROVAL PHASE:
   - Approvers review and approve with signatures
   - Signatures saved to document_approvals table
   ↓
4. DOWNLOAD:
   - Original PDF (unchanged)
   - Approval History PDF (with approver signatures)
```

---

## 📁 Files to Modify

### Backend (8 files):
1. ✅ `backend/src/modules/public/pdfSigning.service.ts` - Update PDF generation
2. ✅ `backend/src/modules/approvals/approvalHistory.service.ts` - NEW: Generate approval report
3. ✅ `backend/src/modules/documents/documents.controller.ts` - Add download endpoints
4. ✅ `backend/src/modules/documents/documents.service.ts` - Add download methods
5. ✅ `backend/src/modules/documents/documents.routes.ts` - Add routes
6. ✅ `backend/src/modules/public/publicSign.controller.ts` - Update download
7. ✅ `backend/scripts/test-approver-vs-signer.js` - NEW: Test script
8. ✅ `backend/scripts/generate-approval-history-pdf.js` - NEW: Helper script

### Frontend (4 files):
1. ✅ `frontend/app/(dashboard)/approvals/[id]/page.tsx` - Add note
2. ✅ `frontend/app/(dashboard)/sign-requests/[id]/sign/page.tsx` - Add note
3. ✅ `frontend/app/(dashboard)/documents/page.tsx` - Add download menu
4. ✅ `frontend/components/documents/DownloadMenu.tsx` - NEW: Download dropdown

---

## 🎯 Acceptance Criteria

### Backend:
- [ ] Signed PDF contains ONLY signer signatures
- [ ] Approval history PDF contains ONLY approver signatures
- [ ] Complete package ZIP contains both files
- [ ] All tests passing (100%)
- [ ] API documentation updated

### Frontend:
- [ ] Clear notes on approval page (audit log only)
- [ ] Clear notes on signing page (embedded to PDF)
- [ ] Download menu with 3 options working
- [ ] Visual distinction between approver and signer

### Testing:
- [ ] Backend tests: 6/6 passed
- [ ] Frontend tests: 5/5 passed
- [ ] Manual verification complete
- [ ] PDF structure validated

---

## 🚀 Next Steps

1. **Review this plan** with team
2. **Confirm requirements** are correct
3. **Start Phase 1** - Backend PDF logic
4. **Test incrementally** after each phase
5. **Deploy to staging** for user testing

---

## 📝 Notes

- **Legal Compliance**: Signer signatures have legal value, approver signatures are for audit only
- **Backward Compatibility**: Existing documents keep current behavior
- **Migration**: Optional script to regenerate old PDFs with new logic
- **Performance**: PDF generation may take longer (2 files instead of 1)
- **Storage**: Approval history PDFs stored separately

---

**Created**: 2025-11-26  
**Estimated Time**: 3.5 hours  
**Priority**: High  
**Status**: Ready for implementation
