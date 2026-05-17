# Đề Xuất: Tích Hợp Quy Trình Phê Duyệt & Ký

**Ngày**: 2025-11-22  
**Vấn đề**: Quy trình phê duyệt và ký đang tách biệt, không hợp lý  
**Giải pháp**: Tích hợp 2 quy trình thành 1 luồng liền mạch

---

## 🔴 Vấn Đề Hiện Tại

### Luồng Tách Biệt (Không Hợp Lý)
```
┌─────────────┐
│   Upload    │
│  Tài liệu   │
└──────┬──────┘
       │
       ├──────────────────┬──────────────────┐
       │                  │                  │
       ▼                  ▼                  ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Trình ký  │    │ Trình duyệt │    │  Lưu trữ    │
│  (riêng lẻ) │    │  (riêng lẻ) │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
```

**Nhược điểm**:
- ❌ Phải tạo 2 quy trình riêng biệt
- ❌ Không biết tài liệu đã duyệt chưa khi gửi ký
- ❌ Có thể gửi ký trước khi duyệt (sai quy trình)
- ❌ Không tự động chuyển từ duyệt → ký
- ❌ Khó theo dõi trạng thái tổng thể

---

## 🟢 Giải Pháp: Quy Trình Tích Hợp

### Luồng Liền Mạch (Hợp Lý)
```
┌─────────────┐
│   Upload    │
│  Tài liệu   │
│ (draft)     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Chỉnh sửa   │
│ Sign Fields │ (nếu cần ký)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Trình duyệt │ ◄── Workflow tự động theo document_type
│ (nếu cần)   │     (require_approval = true)
└──────┬──────┘
       │
       ├─── Approved ───┐
       │                │
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│ Tự động tạo │  │   Lưu trữ   │
│Sign Request │  │  (nếu không │
│& gửi link ký│  │   cần ký)   │
└──────┬──────┘  └─────────────┘
       │
       ▼
┌─────────────┐
│  Người ký   │
│ điền fields │
│  + submit   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Completed  │
│   & Lưu     │
└─────────────┘
```

**Ưu điểm**:
- ✅ Quy trình tự nhiên: Upload → Duyệt → Ký → Lưu
- ✅ Tự động chuyển từ duyệt → ký
- ✅ Không thể ký trước khi duyệt
- ✅ Theo dõi trạng thái dễ dàng
- ✅ Cấu hình linh hoạt theo loại tài liệu

---

## 📋 Chi Tiết Quy Trình

### 1. Cấu Hình Loại Tài Liệu (document_types)

```typescript
{
  id: 1,
  code: "HD",
  name: "Hợp đồng",
  require_approval: true,           // Cần phê duyệt
  default_workflow_id: 1,           // Workflow mặc định
  require_digital_signing: true,    // Cần ký số
  // ... các field khác
}
```

**4 Chế Độ**:
1. **Không duyệt, không ký**: Lưu trữ đơn giản
2. **Chỉ duyệt**: Quy trình phê duyệt
3. **Chỉ ký**: Quy trình ký (không cần duyệt)
4. **Duyệt + Ký**: Quy trình đầy đủ (đề xuất)

### 2. Trạng Thái Tài Liệu (documents.status)

```typescript
enum DocumentStatus {
  draft              // Nháp, đang soạn
  pending_approval   // Đang chờ duyệt
  approved           // Đã duyệt, chờ ký (nếu cần)
  pending_signature  // Đang chờ ký
  signed             // Đã ký, chờ hoàn tất
  completed          // Hoàn thành
  rejected           // Bị từ chối
  cancelled          // Đã hủy
}
```

### 3. Luồng Xử Lý

#### Bước 1: Upload Tài Liệu
```typescript
POST /api/v1/documents
{
  document_type_id: 1,  // Hợp đồng
  file: <PDF>,
  title: "Hợp đồng mua bán"
}

→ Status: draft
→ Nếu require_digital_signing = true:
  → Tự động tạo sign_request (draft)
```

#### Bước 2: Chỉnh Sửa Fields Ký (Nếu Cần)
```typescript
GET /api/v1/documents/:id/sign-request
→ Trả về sign_request_id

GET /api/v1/sign-requests/:id/editor
→ Mở editor, thêm fields

POST /api/v1/sign-requests/:id/fields
→ Lưu fields
```

#### Bước 3: Trình Duyệt
```typescript
POST /api/v1/documents/:id/submit-for-approval
{
  workflow_id: 1  // Optional, dùng default nếu không có
}

→ Tạo workflow_instance
→ Tạo document_approvals cho bước đầu
→ Status: draft → pending_approval
→ Gửi email cho người duyệt bước 1
```

#### Bước 4: Phê Duyệt
```typescript
POST /api/v1/approvals/:id/approve
{
  comment: "Đồng ý"
}

→ Nếu còn bước tiếp theo:
  → Tạo approval cho bước tiếp
  → Gửi email người duyệt tiếp
→ Nếu hết bước:
  → Status: pending_approval → approved
  → Kiểm tra require_digital_signing
  → Nếu true: Tự động gửi sign request
```

#### Bước 5: Tự Động Gửi Ký (Sau Khi Duyệt)
```typescript
// Tự động trigger khi approval hoàn thành
async function onApprovalCompleted(documentId) {
  const document = await getDocument(documentId);
  
  if (document.document_type.require_digital_signing) {
    const signRequest = await getSignRequestByDocument(documentId);
    
    // Validate fields
    await validateSignFields(signRequest.id);
    
    // Generate tokens & send
    await sendSignRequest(signRequest.id);
    
    // Update status
    document.status = 'pending_signature';
  } else {
    // Không cần ký → Hoàn thành
    document.status = 'completed';
  }
}
```

#### Bước 6: Người Ký Thực Hiện
```typescript
// Người ký nhận email với link
GET /public/sign/:token
→ Hiển thị tài liệu + fields

POST /public/sign/:token/sign
{
  otp: "123456",
  field_values: [...]
}

→ Lưu field values
→ Nếu tất cả đã ký:
  → Status: pending_signature → signed
  → Trigger: Generate final PDF (future)
  → Status: signed → completed
```

---

## 🔧 Thay Đổi Cần Thiết

### 1. Database Schema

#### documents table (thêm field)
```sql
ALTER TABLE documents 
ADD COLUMN sign_request_id INT REFERENCES sign_requests(id);
```

**Lý do**: Liên kết trực tiếp document ↔ sign_request (1-1)

#### sign_requests table (thêm field)
```sql
ALTER TABLE sign_requests
ADD COLUMN auto_created BOOLEAN DEFAULT false;
```

**Lý do**: Phân biệt sign request tự động tạo vs thủ công

### 2. Backend Services

#### DocumentsService (thêm methods)
```typescript
class DocumentsService {
  // Tạo tài liệu + sign request (nếu cần)
  async createDocument(data) {
    const document = await documentsRepository.create(data);
    
    // Nếu loại tài liệu yêu cầu ký
    if (data.document_type.require_digital_signing) {
      const signRequest = await signRequestsService.createDraft({
        document_id: document.id,
        auto_created: true
      });
      
      document.sign_request_id = signRequest.id;
      await documentsRepository.update(document.id, { 
        sign_request_id: signRequest.id 
      });
    }
    
    return document;
  }
  
  // Trình duyệt
  async submitForApproval(documentId, workflowId?) {
    const document = await this.getDocument(documentId);
    
    // Validate
    if (document.status !== 'draft') {
      throw new Error('Document must be in draft status');
    }
    
    // Nếu có sign request, validate fields
    if (document.sign_request_id) {
      await signRequestFieldsService.validateFieldsBeforeSend(
        document.sign_request_id
      );
    }
    
    // Tạo workflow instance
    await approvalsService.submitForApproval({
      document_id: documentId,
      workflow_id: workflowId || document.document_type.default_workflow_id
    });
    
    // Update status
    await documentsRepository.update(documentId, {
      status: 'pending_approval'
    });
  }
}
```

#### ApprovalsService (thêm logic)
```typescript
class ApprovalsService {
  async approve(approvalId, userId, comment) {
    // ... existing approval logic ...
    
    // Nếu workflow hoàn thành
    if (allStepsApproved) {
      const document = await documentsRepository.findById(documentId);
      
      // Nếu cần ký → Tự động gửi
      if (document.document_type.require_digital_signing) {
        await this.autoSendSignRequest(document);
      } else {
        // Không cần ký → Hoàn thành
        await documentsRepository.update(documentId, {
          status: 'completed'
        });
      }
    }
  }
  
  async autoSendSignRequest(document) {
    const signRequest = await signRequestsRepository.findById(
      document.sign_request_id
    );
    
    // Generate tokens & send
    await signRequestsService.sendSignRequest(
      signRequest.id,
      document.tenant_id,
      null // System auto-send
    );
    
    // Update document status
    await documentsRepository.update(document.id, {
      status: 'pending_signature'
    });
    
    // Send email to signers
    await emailService.sendSignRequestNotifications(signRequest);
  }
}
```

### 3. Frontend UI

#### Documents Upload Page
```typescript
// Sau khi upload thành công
if (document.sign_request_id) {
  // Hiển thị nút "Chỉnh sửa fields ký"
  <Button onClick={() => router.push(
    `/sign-requests/${document.sign_request_id}/editor`
  )}>
    📝 Chỉnh sửa Fields Ký
  </Button>
}

// Nút trình duyệt
<Button onClick={() => submitForApproval(document.id)}>
  📤 Trình Duyệt
</Button>
```

#### Documents List Page
```typescript
// Hiển thị trạng thái rõ ràng
<StatusBadge status={document.status} />

// Actions theo trạng thái
{document.status === 'draft' && (
  <>
    {document.sign_request_id && (
      <Button href={`/sign-requests/${document.sign_request_id}/editor`}>
        📝 Edit Fields
      </Button>
    )}
    <Button onClick={() => submitForApproval(document.id)}>
      📤 Submit for Approval
    </Button>
  </>
)}

{document.status === 'pending_approval' && (
  <Badge>⏳ Đang chờ duyệt</Badge>
)}

{document.status === 'pending_signature' && (
  <Badge>✍️ Đang chờ ký</Badge>
)}

{document.status === 'completed' && (
  <Badge>✅ Hoàn thành</Badge>
)}
```

---

## 📊 Ví Dụ Cụ Thể

### Ví Dụ 1: Hợp Đồng (Cần Duyệt + Ký)

```
1. User upload hợp đồng
   → document_type: "Hợp đồng" (require_approval=true, require_digital_signing=true)
   → Status: draft
   → Tự động tạo sign_request (draft)

2. User click "📝 Edit Fields"
   → Mở editor
   → Thêm 3 fields: Chữ ký A, Chữ ký B, Ngày ký
   → Save

3. User click "📤 Trình Duyệt"
   → Workflow: Trưởng phòng → Giám đốc
   → Status: draft → pending_approval
   → Email gửi Trưởng phòng

4. Trưởng phòng duyệt
   → Email gửi Giám đốc

5. Giám đốc duyệt (bước cuối)
   → Status: pending_approval → approved
   → Tự động gửi sign request
   → Status: approved → pending_signature
   → Email gửi người ký A & B với link

6. Người ký A điền fields + OTP → Submit
   → Signer A: completed

7. Người ký B điền fields + OTP → Submit
   → Signer B: completed
   → Tất cả đã ký
   → Status: pending_signature → completed
```

### Ví Dụ 2: Công Văn Đến (Chỉ Lưu Trữ)

```
1. User upload công văn đến
   → document_type: "Công văn đến" (require_approval=false, require_digital_signing=false)
   → Status: draft

2. User click "💾 Lưu"
   → Status: draft → completed
   → Không cần duyệt, không cần ký
```

### Ví Dụ 3: Đề Xuất (Chỉ Duyệt)

```
1. User upload đề xuất
   → document_type: "Đề xuất" (require_approval=true, require_digital_signing=false)
   → Status: draft

2. User click "📤 Trình Duyệt"
   → Workflow: Manager → Director
   → Status: draft → pending_approval

3. Manager & Director duyệt
   → Status: pending_approval → completed
   → Không cần ký
```

---

## ⏱️ Ước Lượng Thời Gian

### Backend (3 hours)
- Database migration: 15 mins
- DocumentsService updates: 45 mins
- ApprovalsService integration: 1 hour
- Email notifications: 30 mins
- Testing: 30 mins

### Frontend (2 hours)
- Documents page updates: 1 hour
- Status badges & actions: 30 mins
- Testing: 30 mins

**Total**: ~5 hours

---

## 🎯 Lợi Ích

### Cho Người Dùng
- ✅ Quy trình tự nhiên, dễ hiểu
- ✅ Không cần tạo 2 quy trình riêng
- ✅ Tự động chuyển từ duyệt → ký
- ✅ Theo dõi trạng thái rõ ràng

### Cho Hệ Thống
- ✅ Dữ liệu nhất quán
- ✅ Dễ bảo trì
- ✅ Linh hoạt cấu hình
- ✅ Mở rộng dễ dàng

---

## 🚀 Kế Hoạch Triển Khai

### Phase 1: Backend Integration (2 hours)
1. Database migration
2. Update DocumentsService
3. Update ApprovalsService
4. Add auto-send logic

### Phase 2: Frontend Updates (1.5 hours)
1. Update Documents page
2. Add status badges
3. Add action buttons

### Phase 3: Testing (1 hour)
1. Test 4 chế độ
2. Test quy trình đầy đủ
3. Test edge cases

### Phase 4: Documentation (30 mins)
1. Update user guide
2. Update API docs
3. Create demo video

**Total**: ~5 hours

---

## 📝 Checklist

### Backend
- [ ] Add sign_request_id to documents table
- [ ] Add auto_created to sign_requests table
- [ ] Update DocumentsService.createDocument()
- [ ] Update DocumentsService.submitForApproval()
- [ ] Update ApprovalsService.approve()
- [ ] Add ApprovalsService.autoSendSignRequest()
- [ ] Update email templates
- [ ] Add tests

### Frontend
- [ ] Update Documents upload page
- [ ] Update Documents list page
- [ ] Add status badges
- [ ] Add action buttons
- [ ] Update navigation
- [ ] Add tests

### Documentation
- [ ] Update user guide
- [ ] Update API docs
- [ ] Create workflow diagram
- [ ] Record demo video

---

## 🎉 Kết Luận

Tích hợp quy trình phê duyệt và ký sẽ tạo ra một hệ thống E-Office hoàn chỉnh và hợp lý hơn. Người dùng sẽ có trải nghiệm tốt hơn với quy trình tự nhiên: **Upload → Duyệt → Ký → Lưu**.

**Đề xuất**: Triển khai trong session tiếp theo (5 hours)

