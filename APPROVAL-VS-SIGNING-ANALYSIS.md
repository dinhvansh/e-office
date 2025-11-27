# 📋 Phân tích: Approval Workflow vs Digital Signing

**Date**: 2025-11-27  
**Author**: Kiro AI Assistant  
**Status**: Analysis & Proposal (Option 1 ĐÃ CHỐT)  
> Ghi chú: Các phương án 2/3 phía dưới chỉ để tham khảo phân tích.  
> Dev khi implement phải làm theo **Phương Án 1 + ACTION ITEMS + CONCLUSION + mục 9**, KHÔNG được implement Phương Án 2 hoặc 3.

---

## 📊 1. HIỆN TRẠNG HỆ THỐNG

### 🔍 **Phát hiện vấn đề**:

Hiện tại hệ thống có **2 hệ thống song song** nhưng **CHỒNG CHÉO** chức năng:

#### **Hệ thống 1: Workflow Approval** ✅
- **Mục đích**: Phê duyệt nội dung văn bản
- **Nguồn**: Document Type → Workflow Templates
- **Người tham gia**: Workflow Steps (approvers)
- **Kết quả**: Audit log, KHÔNG ký trên PDF
- **Database**: `workflows`, `workflow_steps`, `workflow_instances`, `document_approvals`
- **UI**: Trang "Công việc của tôi" → Tab "Phê duyệt"

#### **Hệ thống 2: Sign Request** ✅
- **Mục đích**: Ký số trên văn bản
- **Nguồn**: Trang "Tạo yêu cầu ký mới"
- **Người tham gia**: 
  - Internal Signers (có field `role`: signer/approver) ⚠️
  - External Signers (có field `role`: signer/approver) ⚠️
- **Kết quả**: 
  - `role='signer'` → Chữ ký trên PDF
  - `role='approver'` → Audit log (??) ⚠️
- **Database**: `sign_requests`, `signers`
- **UI**: Trang "Quy trình ký" → "Tạo yêu cầu ký mới"

---

## ⚠️ 2. VẤN ĐỀ PHÁT HIỆN

### **Vấn đề 1: Trùng lặp chức năng "Approver"**

```
Workflow Approvers (Hệ thống 1)
  ↓
  Phê duyệt nội dung → Audit log
  
Sign Request Approvers (Hệ thống 2) ⚠️
  ↓
  Phê duyệt (??) → Audit log (??)
```

**Câu hỏi**:
- Có cần 2 lớp phê duyệt không?
- `role='approver'` trong signers table dùng để làm gì?
- Có khác gì với workflow approvers không?

### **Vấn đề 2: Không theo FUNCTIONAL_SPEC.md**

Theo blueprint (FUNCTIONAL_SPEC.md):

**Section 6: Approval Workflow Engine**
- Mục đích: Phê duyệt nội dung
- Kết quả: Audit log
- KHÔNG đề cập đến "approver role" trong signing

**Section 12.1: Digital Signature Integration**
- Mục đích: Ký số trên PDF
- Kết quả: Signed PDF file
- KHÔNG đề cập đến "approver" trong signers

→ **2 hệ thống RIÊNG BIỆT, KHÔNG CHỒNG CHÉO** ✅

### **Vấn đề 3: Gây nhầm lẫn cho user**

User không hiểu:
- "Người phê duyệt" trong workflow khác gì "Người phê duyệt" trong sign request?
- Khi nào dùng workflow approval?
- Khi nào dùng sign request approver?
- Có cần cả 2 không?

---

## 📋 3. SO SÁNH 3 PHƯƠNG ÁN

### **Phương án 1: Tách biệt hoàn toàn** ✅ (Khuyến nghị)

```
Upload Document
  ↓
Workflow Approval (Nếu có)
  - Approvers phê duyệt nội dung
  - Audit log ONLY
  - KHÔNG ký trên PDF
  ↓
✅ APPROVED
  ↓
Digital Signing (Nếu cần)
  - Internal Signers (TẤT CẢ đều ký PDF)
  - External Signers (TẤT CẢ đều ký PDF)
  - BỎ role='approver'
  ↓
✅ COMPLETED
```

**Ưu điểm**:
- ✅ Rõ ràng: Approval ≠ Signing
- ✅ Không trùng lặp
- ✅ Dễ hiểu cho user
- ✅ Theo đúng FUNCTIONAL_SPEC.md
- ✅ Dễ maintain và scale

**Nhược điểm**:
- ❌ Không linh hoạt (approver không thể ký luôn)
- ❌ Phải qua 2 bước riêng biệt

**Độ phức tạp**: Thấp (đơn giản nhất)

---

### **Phương án 2: Hợp nhất** 🔄

```
Upload Document
  ↓
Sign Request (Kết hợp cả 2)
  - Internal Signers:
    - role='approver' → Phê duyệt (audit log)
    - role='signer' → Ký số (PDF)
  - External Signers:
    - role='signer' ONLY
  ↓
✅ COMPLETED
```

**Ưu điểm**:
- ✅ Đơn giản hóa (chỉ 1 hệ thống)
- ✅ Linh hoạt (approver có thể ký luôn)
- ✅ Ít bước hơn

**Nhược điểm**:
- ❌ Mất workflow templates
- ❌ Khó quản lý approval phức tạp (multi-step, conditional)
- ❌ KHÔNG theo FUNCTIONAL_SPEC.md
- ❌ Khó scale khi cần workflow phức tạp

**Độ phức tạp**: Trung bình

---

### **Phương án 3: Kết hợp thông minh** 🎯

```
Upload Document
  ↓
Workflow Approval (Tùy chọn)
  - Approvers phê duyệt nội dung
  - Option: "Ký luôn khi approve" ✅
  ↓
✅ APPROVED
  ↓
Digital Signing
  - Internal Signers
  - External Signers
  - Nếu approver đã "ký luôn" → Tự động thêm vào signers
  ↓
✅ COMPLETED
```

**Ưu điểm**:
- ✅ Linh hoạt nhất
- ✅ Giữ được workflow system
- ✅ Cho phép approver ký luôn (nếu muốn)
- ✅ Vẫn theo FUNCTIONAL_SPEC.md (2 hệ thống riêng)

**Nhược điểm**:
- ❌ Phức tạp hơn để implement
- ❌ User có thể bối rối ban đầu
- ❌ Cần logic sync giữa 2 hệ thống

**Độ phức tạp**: Cao

---

## 🎯 4. ĐỀ XUẤT GIẢI PHÁP

### **Khuyến nghị: Phương án 1** ✅

**Lý do**:
1. ✅ **Đúng theo blueprint** (FUNCTIONAL_SPEC.md)
2. ✅ **Rõ ràng nhất** cho user
3. ✅ **Dễ maintain** và scale
4. ✅ **Ít bug** hơn (không có logic phức tạp)
5. ✅ **Dễ test** và verify

### **Implementation Plan**:

#### **Phase 1: Cleanup (1-2 hours)**

1. **BỎ `role` field** khỏi signers table
   - Update Prisma schema
   - Remove role column
   - Migration script

2. **Update Frontend Components**:
   - `InternalSignersSection.tsx` - BỎ role dropdown
   - `SignersSection.tsx` - BỎ role dropdown
   - `ManageSignersDialog.tsx` - BỎ role dropdown

3. **Update Backend Logic**:
   - `signRequests.service.ts` - Remove role handling
   - All signers = ký trên PDF (no distinction)

4. **Update Documentation**:
   - Clear separation: Approval vs Signing
   - User guide updates

#### **Phase 2: Testing (30 mins)**

1. Test workflow approval flow
2. Test signing flow (internal + external)
3. Verify no role confusion
4. Update test scripts

#### **Phase 3: User Communication (15 mins)**

1. Update UI hints/tooltips
2. Add help text explaining:
   - "Phê duyệt" = Workflow (audit log)
   - "Ký số" = Sign Request (PDF signature)

---

## 📊 5. SO SÁNH TRƯỚC/SAU

### **TRƯỚC** (Hiện tại - Confusing):

```
Document Type → Workflow
  ↓
Workflow Approvers (phê duyệt nội dung)
  ↓
Sign Request
  ↓
Internal Signers:
  - role='signer' → Ký PDF
  - role='approver' → ??? (Phê duyệt gì?)
  ↓
External Signers:
  - role='signer' → Ký PDF
  - role='approver' → ??? (Không rõ)
```

❌ **Vấn đề**: 2 lớp "approver", không rõ khác nhau thế nào

---

### **SAU** (Đề xuất - Clear):

```
Document Type → Workflow
  ↓
Workflow Approvers (phê duyệt nội dung)
  - Approve/Reject/RequestInfo
  - Audit log ONLY
  - KHÔNG ký PDF
  ↓
✅ APPROVED
  ↓
Sign Request
  ↓
Internal Signers (TẤT CẢ ký PDF)
  - Chọn từ user list
  - Drag & drop reorder
  - Ký trong hệ thống (no OTP)
  ↓
External Signers (TẤT CẢ ký PDF)
  - Nhập email + name
  - Drag & drop reorder
  - Ký qua link + OTP
  ↓
✅ COMPLETED (PDF có chữ ký)
```

✅ **Lợi ích**: Rõ ràng, không trùng lặp, dễ hiểu

---

## 🔧 6. ACTION ITEMS

### **Immediate (Ngay lập tức)**:

- [ ] **Decision**: Chọn phương án (1, 2, hoặc 3)
- [ ] **Confirm**: User đồng ý với hướng đi

### **If Phương án 1 (Recommended)**:

- [ ] Remove `role` field from signers table
- [ ] Update InternalSignersSection (remove role dropdown)
- [ ] Update SignersSection (remove role dropdown)
- [ ] Update ManageSignersDialog (remove role dropdown)
- [ ] Update backend service (remove role logic)
- [ ] Update documentation
- [ ] Test complete flow
- [ ] Update user guide

**Estimated Time**: 2-3 hours total

---

## 📝 7. NOTES

### **Use Cases cần xác nhận**:

1. **Có cần người phê duyệt KHÔNG ký trên PDF không?**
   - Nếu CÓ → Dùng Workflow Approval
   - Nếu KHÔNG → Bỏ qua workflow, chỉ cần Sign Request

2. **Có cần người vừa phê duyệt VỪA ký không?**
   - Phương án 1: Phải qua 2 bước (approve → sign)
   - Phương án 3: Có option "ký luôn khi approve"

3. **Workflow có phức tạp không?**
   - Nếu CÓ (multi-step, conditional) → Giữ workflow system
   - Nếu KHÔNG (chỉ 1-2 người approve) → Có thể đơn giản hóa

---

## ✅ 8. CONCLUSION

**Recommendation**: **Phương án 1 - Tách biệt hoàn toàn**

**Lý do chính**:
1. Đúng theo FUNCTIONAL_SPEC.md
2. Rõ ràng và dễ hiểu nhất
3. Dễ maintain và scale
4. Ít bug và confusion

**Next Step**: 
- User confirm phương án
- Implement cleanup (2-3 hours)
- Test và deploy

---

## dY"z 9. THIẾT KẾ UI HỢP NHẤT QUY TRÌNH KÝ – DUYỆT (CHO DEV)

> Mục tiêu: **Người dùng chỉ thấy 1 luồng duy nhất**, nhưng backend vẫn tách riêng Workflow Approval và Sign Request.

### 9.1 Quyết định kiến trúc

- Backend giữ **Phương án 1**:  
  - Workflow Approval Engine (workflows, document_approvals) xử lý phê duyệt nội dung.  
  - Digital Signing Engine (sign_requests, signers, sign_request_fields, field_values) xử lý ký số lên PDF.  
- Frontend/UX: xây **1 màn hình hợp nhất** để theo dõi toàn bộ quy trình ký + duyệt.

### 9.2 Màn hình danh sách quy trình

- Trang: `Quy trình ký & duyệt` (route do FE quyết định, ví dụ `/flows` hoặc `/documents/flows`).  
- Mỗi dòng:
  - Tiêu đề / mã tài liệu / loại văn bản.
  - Trạng thái tổng: `Chuẩn bị` / `Đang phê duyệt` / `Đang ký` / `Hoàn tất` / `Bị từ chối`.
  - Số bước phê duyệt, số người ký, deadline, % hoàn thành.
- Bộ lọc:
  - Tôi là người tạo / người phê duyệt / người ký.
  - Theo trạng thái tổng, loại văn bản, phòng ban.

### 9.3 Màn hình chi tiết 1 quy trình (Unified Detail View)

- Route gợi ý: `frontend/app/documents/[id]/flow/page.tsx`.
- Layout 3 khu:

1. **Header**
   - Thông tin tài liệu (tiêu đề, mã, loại).
   - Badge trạng thái tổng.
   - Progress bar 4 đoạn: `Chuẩn bị → Phê duyệt → Ký → Hoàn tất`.

2. **Cột trái – Timeline / Stepper**
   - Dữ liệu lấy từ API hợp nhất (xem 9.4).  
   - Mỗi step gồm:
     - `type`: `approval` hoặc `signing`.  
     - Thứ tự (`order`).  
     - Người phụ trách (id, name, avatar).  
     - Trạng thái: `pending` / `in_progress` / `approved` / `rejected` / `signed`.  
     - Thời gian bắt đầu/kết thúc, comment (nếu có).  
   - Click 1 step → focus tại viewer + hiển thị hoạt động liên quan.

3. **Trung tâm – Document Viewer & Actions**
   - Viewer PDF tài liệu.  
   - Nếu user hiện tại là chủ step:
     - Step `approval` → nút `Phê duyệt`, `Từ chối`, `Yêu cầu bổ sung` (reuse dialog hiện có).  
     - Step `signing` → nút `Mở màn hình ký` (đi tới `/sign/:token` hoặc editor nội bộ).  
   - Nếu chỉ là người xem → không hiển thị nút hành động.

4. **Cột phải – Hoạt động & Người tham gia**
   - Tab `Hoạt động`: log kết hợp từ workflow + signing.  
   - Tab `Người tham gia`: toàn bộ approver + signer với trạng thái.  
   - Tab `File đã ký` (sau này): link tải PDF gốc + PDF đã ký.

### 9.4 Backend – API hợp nhất cho UI

- Tạo service mới (ví dụ `documentFlow.service.ts`) gom dữ liệu từ:
  - `documents`, `workflow_instances`, `document_approvals`
  - `sign_requests`, `signers`, `sign_request_fields`, `sign_request_field_values`
- Expose endpoint:

```http
GET /api/v1/documents/:id/flow
```

**Response gợi ý (pseudo):**
```json
{
  "document": { "id": 1, "title": "Hợp đồng A", "status": "approved_and_signing" },
  "phases": [
    { "key": "approval", "label": "Phê duyệt", "status": "completed" },
    { "key": "signing", "label": "Ký số", "status": "in_progress" }
  ],
  "steps": [
    {
      "id": "approval-1",
      "type": "approval",
      "order": 1,
      "user": { "id": 10, "name": "Trưởng phòng A" },
      "status": "approved",
      "started_at": "...",
      "completed_at": "...",
      "comment": "OK"
    },
    {
      "id": "signing-1",
      "type": "signing",
      "order": 3,
      "user": { "id": 20, "name": "Nguyễn Văn B" },
      "status": "pending",
      "signer_kind": "internal"
    }
  ],
  "activities": [
    { "timestamp": "...", "actor": "Nguyễn Văn A", "action": "Tạo tài liệu" },
    { "timestamp": "...", "actor": "Trưởng phòng A", "action": "Phê duyệt" },
    { "timestamp": "...", "actor": "Hệ thống", "action": "Gửi yêu cầu ký cho Nguyễn Văn B" }
  ]
}
```

**Yêu cầu bảo mật cho endpoint**:
- Bắt buộc tenant check.  
- Áp dụng document visibility (tenant, department, scope, confidential level).  
- Áp dụng RBAC (chỉ user có quyền xem document mới gọi được).

### 9.5 Tóm tắt tasks cho DEV

- **Backend**
  - [ ] Tạo service `documentFlow.service.ts` gom dữ liệu workflow + signing.  
  - [ ] Tạo endpoint `GET /api/v1/documents/:id/flow`.  
  - [ ] Đảm bảo tenant + visibility + RBAC như các API documents khác.
- **Frontend**
  - [ ] Tạo page `documents/[id]/flow` hiển thị timeline + viewer + activity.  
  - [ ] Tạo component `FlowTimeline` dùng dữ liệu `steps`.  
  - [ ] Tích hợp từ danh sách Documents / Approvals / Sign Requests: nút “Xem quy trình”.

---

**End of Document**
