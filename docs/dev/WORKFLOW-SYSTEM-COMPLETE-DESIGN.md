# Workflow System - Complete Design (4 Modes)

## 📅 Date: 2025-11-21
## ⏱️ Estimated: 6-7 hours
## 🎯 Status: Ready to implement

---

## 🎯 Tổng quan

Hệ thống workflow linh hoạt với **4 chế độ** hoạt động:

1. **No Approval** - Không cần phê duyệt
2. **Strict Workflow** - Workflow cố định (bắt buộc)
3. **Flexible Workflow** - Workflow linh hoạt (có thể tùy chỉnh)
4. **Ad-hoc Workflow** - Tự tạo workflow (điền tay)

---

## 📊 Decision Matrix

| Chế độ | Require Approval | Default Workflow | Allow Override | User Action |
|--------|------------------|------------------|----------------|-------------|
| **1. No Approval** | ❌ No | - | - | Upload → Active |
| **2. Strict** | ✅ Yes | ✅ Set | ❌ No | Upload → Auto-submit |
| **3. Flexible** | ✅ Yes | ✅ Set | ✅ Yes | Upload → Customize → Submit |
| **4. Ad-hoc** | ✅ Yes | ❌ Not Set | - | Upload → Create workflow → Submit |

---

## 🔧 Database Schema

### **document_types:**
```prisma
model document_types {
  id                      Int       @id @default(autoincrement())
  tenant_id               Int
  code                    String
  name                    String
  
  // Workflow configuration
  require_approval        Boolean   @default(false)
  default_workflow_id     Int?      // NULL = Ad-hoc mode
  allow_workflow_override Boolean   @default(false)
  
  // Other fields...
  require_numbering       Boolean   @default(true)
  require_digital_signing Boolean   @default(false)
  is_active               Boolean   @default(true)
  created_at              DateTime  @default(now())
  
  // Relations
  tenant                  tenants   @relation(fields: [tenant_id], references: [id])
  default_workflow        workflows? @relation("default_workflow", fields: [default_workflow_id], references: [id])
  
  @@unique([tenant_id, code])
}
```

### **workflows:**
```prisma
model workflows {
  id                Int       @id @default(autoincrement())
  tenant_id         Int
  name              String
  description       String?
  
  // Workflow type
  is_template       Boolean   @default(true)   // false = ad-hoc/customized
  created_for_doc   Int?                        // For ad-hoc workflows
  based_on_template Int?                        // For customized workflows
  
  is_active         Boolean   @default(true)
  created_by        Int?
  created_at        DateTime  @default(now())
  
  // Relations
  tenant            tenants   @relation(fields: [tenant_id], references: [id])
  steps             workflow_steps[]
  
  @@unique([tenant_id, name])
}
```

---

## 🎨 UI Design

### **1. Document Type Setup (Admin):**

```
┌──────────────────────────────────────────────────────┐
│ Loại văn bản: Công văn đi                           │
├──────────────────────────────────────────────────────┤
│ Mã: CV_DI                                            │
│ Tên: Công văn đi                                     │
│                                                       │
│ ☑ Yêu cầu đánh số văn bản                           │
│ ☑ Yêu cầu phê duyệt                                 │
│ ☐ Yêu cầu ký số                                      │
│                                                       │
│ Quy trình phê duyệt mặc định:                        │
│ [Phê duyệt 2 cấp                          ▼]        │
│ [-- Không chọn (User tự tạo) --]  ← Option          │
│                                                       │
│ ☑ Cho phép tùy chỉnh luồng ký khi trình            │
│   (Chỉ hiện khi đã chọn workflow)                   │
│                                                       │
│ [Lưu]  [Hủy]                                        │
└──────────────────────────────────────────────────────┘
```

---

### **2. Upload Document - 4 Scenarios:**

#### **Scenario 1: No Approval**
```
┌─────────────────────────────────────────────┐
│ Loại: [Tài liệu tham khảo         ▼]      │
│                                              │
│ (Không hiện phần workflow)                  │
│                                              │
│ [Chọn file PDF...]                          │
│ [Upload]                                     │
└─────────────────────────────────────────────┘

Result: Status = active
```

---

#### **Scenario 2: Strict Workflow**
```
┌─────────────────────────────────────────────┐
│ Loại: [Hợp đồng                    ▼]     │
│                                              │
│ ┌─────────────────────────────────────────┐│
│ │ ℹ️ Quy trình phê duyệt bắt buộc        ││
│ │                                          ││
│ │ "Phê duyệt hợp đồng (3 bước)"          ││
│ │                                          ││
│ │ Bước 1: Trưởng phòng (3 ngày)          ││
│ │ Bước 2: Phòng Pháp chế (5 ngày)        ││
│ │ Bước 3: Giám đốc (7 ngày)              ││
│ └─────────────────────────────────────────┘│
│                                              │
│ [Chọn file PDF...]                          │
│ [Upload & Trình ký]                         │
└─────────────────────────────────────────────┘

Result: Auto-submit với template
```

---

#### **Scenario 3: Flexible Workflow**
```
┌─────────────────────────────────────────────┐
│ Loại: [Công văn đi                 ▼]     │
│                                              │
│ ┌─────────────────────────────────────────┐│
│ │ 📝 Quy trình phê duyệt                  ││
│ │                                          ││
│ │ Mặc định: "Phê duyệt 2 cấp"            ││
│ │ (Bạn có thể tùy chỉnh)                 ││
│ │                                          ││
│ │ Bước 1:                                 ││
│ │ [Nguyễn Văn A - Manager    ▼] [X]      ││
│ │ Thời hạn: [3] ngày                      ││
│ │                                          ││
│ │ Bước 2:                                 ││
│ │ [Trần Thị B - Director     ▼] [X]      ││
│ │ Thời hạn: [5] ngày                      ││
│ │                                          ││
│ │ [+ Thêm bước] [↻ Khôi phục mặc định]   ││
│ └─────────────────────────────────────────┘│
│                                              │
│ [Chọn file PDF...]                          │
│ [Upload & Trình ký]                         │
└─────────────────────────────────────────────┘

Result: Submit với workflow đã tùy chỉnh
```

---

#### **Scenario 4: Ad-hoc Workflow (NEW!)**
```
┌─────────────────────────────────────────────┐
│ Loại: [Đề xuất                     ▼]     │
│                                              │
│ ┌─────────────────────────────────────────┐│
│ │ ✍️ Tạo luồng ký thủ công               ││
│ │                                          ││
│ │ Loại văn bản này chưa có quy trình      ││
│ │ mặc định. Vui lòng chọn người ký:      ││
│ │                                          ││
│ │ Bước 1:                                 ││
│ │ [Chọn người ký                ▼] [X]   ││
│ │ Thời hạn: [3] ngày                      ││
│ │                                          ││
│ │ Bước 2:                                 ││
│ │ [Chọn người ký                ▼] [X]   ││
│ │ Thời hạn: [5] ngày                      ││
│ │                                          ││
│ │ [+ Thêm bước]                           ││
│ └─────────────────────────────────────────┘│
│                                              │
│ [Chọn file PDF...]                          │
│ [Upload & Trình ký]                         │
└─────────────────────────────────────────────┘

Result: Create ad-hoc workflow → Submit
```

---

## 🔄 Backend Logic

### **Upload Document Flow:**
```typescript
async uploadDocument(data, userId, tenantId) {
  // 1. Get document type
  const docType = await this.docTypeRepo.findById(data.document_type_id);
  
  // 2. Create document
  const document = await this.repo.create({
    ...data,
    tenant_id: tenantId,
    owner_id: userId,
    status: docType.require_approval ? 'draft' : 'active',
  });
  
  // 3. Handle workflow based on mode
  if (!docType.require_approval) {
    // Mode 1: No Approval
    return document;
  }
  
  if (!docType.default_workflow_id) {
    // Mode 4: Ad-hoc (User must provide steps)
    if (!data.adhoc_steps || data.adhoc_steps.length === 0) {
      throw new Error('Loại văn bản này yêu cầu tạo luồng ký thủ công');
    }
    
    const workflow = await this.createAdhocWorkflow(
      data.adhoc_steps,
      document.id,
      tenantId,
      userId
    );
    
    await this.approvalsService.submitForApproval(
      document.id,
      workflow.id,
      tenantId,
      userId
    );
    
    return document;
  }
  
  if (!docType.allow_workflow_override) {
    // Mode 2: Strict (Use template as-is)
    await this.approvalsService.submitForApproval(
      document.id,
      docType.default_workflow_id,
      tenantId,
      userId
    );
    
    return document;
  }
  
  // Mode 3: Flexible (Use customized or default)
  if (data.customized_steps) {
    const workflow = await this.createCustomizedWorkflow(
      docType.default_workflow_id,
      data.customized_steps,
      document.id,
      tenantId,
      userId
    );
    
    await this.approvalsService.submitForApproval(
      document.id,
      workflow.id,
      tenantId,
      userId
    );
  } else {
    // Use default template
    await this.approvalsService.submitForApproval(
      document.id,
      docType.default_workflow_id,
      tenantId,
      userId
    );
  }
  
  return document;
}
```

---

## 📋 Document Type Examples

| Loại văn bản | Require Approval | Default Workflow | Allow Override | Mode |
|--------------|------------------|------------------|----------------|------|
| Tài liệu tham khảo | ❌ No | - | - | 1. No Approval |
| Biểu mẫu | ❌ No | - | - | 1. No Approval |
| Hợp đồng | ✅ Yes | Phê duyệt hợp đồng | ❌ No | 2. Strict |
| Quyết định | ✅ Yes | Phê duyệt 2 cấp | ❌ No | 2. Strict |
| Công văn đi | ✅ Yes | Phê duyệt đơn giản | ✅ Yes | 3. Flexible |
| Công văn đến | ✅ Yes | Phê duyệt đơn giản | ✅ Yes | 3. Flexible |
| Đề xuất | ✅ Yes | (Không chọn) | - | 4. Ad-hoc |
| Báo cáo | ✅ Yes | (Không chọn) | - | 4. Ad-hoc |
| Thông báo | ✅ Yes | (Không chọn) | - | 4. Ad-hoc |

---

## 🎯 Use Cases

### **Use Case 1: Tài liệu tham khảo (No Approval)**
```
Admin Setup:
- ☐ Yêu cầu phê duyệt

User Upload:
- Chọn loại: Tài liệu tham khảo
- Upload file
- ✅ Done! Status: active
```

### **Use Case 2: Hợp đồng (Strict)**
```
Admin Setup:
- ☑ Yêu cầu phê duyệt
- Workflow: "Phê duyệt hợp đồng"
- ☐ Cho phép tùy chỉnh

User Upload:
- Chọn loại: Hợp đồng
- Thấy: "Quy trình bắt buộc: Phê duyệt hợp đồng"
- Upload file
- ✅ Auto-submit! Status: pending_approval
```

### **Use Case 3: Công văn đi (Flexible)**
```
Admin Setup:
- ☑ Yêu cầu phê duyệt
- Workflow: "Phê duyệt 2 cấp"
- ☑ Cho phép tùy chỉnh

User Upload:
- Chọn loại: Công văn đi
- Thấy workflow mặc định (2 bước)
- Tùy chỉnh:
  - Sửa bước 1: Manager → Nguyễn Văn A
  - Thêm bước 3: CFO (7 ngày)
- Upload file
- ✅ Submit với workflow tùy chỉnh! Status: pending_approval
```

### **Use Case 4: Đề xuất (Ad-hoc)**
```
Admin Setup:
- ☑ Yêu cầu phê duyệt
- Workflow: (Không chọn)

User Upload:
- Chọn loại: Đề xuất
- Thấy: "Vui lòng tạo luồng ký thủ công"
- Tạo workflow:
  - Bước 1: Nguyễn Văn A (3 ngày)
  - Bước 2: Trần Thị B (5 ngày)
  - Bước 3: Lê Văn C (7 ngày)
- Upload file
- ✅ Submit với ad-hoc workflow! Status: pending_approval
```

---

## 📝 Implementation Checklist

### **Phase 1: Database (30 mins)**
- [ ] Add `require_approval` to document_types
- [ ] Add `default_workflow_id` to document_types (nullable)
- [ ] Add `allow_workflow_override` to document_types
- [ ] Add `is_template` to workflows
- [ ] Add `created_for_doc` to workflows
- [ ] Add `based_on_template` to workflows
- [ ] Run migration
- [ ] Update seed script

### **Phase 2: Backend (2.5 hours)**
- [ ] Update `documentTypes.service.ts`
- [ ] Update `documents.service.ts`
  - [ ] Add mode detection logic
  - [ ] Add `createAdhocWorkflow()`
  - [ ] Add `createCustomizedWorkflow()`
  - [ ] Update `createDocument()` with 4-mode logic
- [ ] Add validation
  - [ ] Mode 4: Require adhoc_steps
  - [ ] Mode 2/3: Require default_workflow_id
- [ ] Test API endpoints

### **Phase 3: Frontend - Document Types (1 hour)**
- [ ] Update Document Types page
  - [ ] Add "Yêu cầu phê duyệt" checkbox
  - [ ] Add "Quy trình mặc định" dropdown (with "Không chọn" option)
  - [ ] Add "Cho phép tùy chỉnh" checkbox (conditional)
  - [ ] Disable "Cho phép tùy chỉnh" when workflow not selected
- [ ] Update form validation

### **Phase 4: Frontend - Documents Upload (2.5 hours)**
- [ ] Create `WorkflowPreview` component (Mode 2: Strict)
- [ ] Create `WorkflowCustomizer` component (Mode 3: Flexible)
- [ ] Create `AdhocWorkflowBuilder` component (Mode 4: Ad-hoc)
- [ ] Update Documents Upload page
  - [ ] Detect mode based on document type
  - [ ] Conditional rendering (4 modes)
  - [ ] Add/Remove/Edit steps logic
  - [ ] Restore default button (Mode 3)
- [ ] Update upload mutation
  - [ ] Send adhoc_steps for Mode 4
  - [ ] Send customized_steps for Mode 3

### **Phase 5: Testing (30 mins)**
- [ ] Test Mode 1: No approval
- [ ] Test Mode 2: Strict workflow
- [ ] Test Mode 3: Flexible workflow
- [ ] Test Mode 4: Ad-hoc workflow
- [ ] Test validation errors

---

## 📊 Estimated Effort

| Task | Time |
|------|------|
| Database schema | 30 mins |
| Backend logic | 2.5 hours |
| Frontend - Document Types | 1 hour |
| Frontend - Upload | 2.5 hours |
| Testing | 30 mins |
| **Total** | **7 hours** |

---

## 🎉 Benefits

### **For Admins:**
- ✅ Full control: 4 chế độ linh hoạt
- ✅ Dễ cấu hình: Chỉ cần 2-3 checkboxes
- ✅ Scalable: Dễ thêm loại văn bản mới

### **For Users:**
- ✅ Rõ ràng: Biết chính xác phải làm gì
- ✅ Linh hoạt: Có thể tùy chỉnh khi cần
- ✅ Nhanh chóng: Có template sẵn hoặc tự tạo

---

## 🔗 Related Files

**Backend:**
- `backend/prisma/schema.prisma`
- `backend/src/modules/documentTypes/documentTypes.service.ts`
- `backend/src/modules/documents/documents.service.ts`
- `backend/src/modules/workflows/workflows.service.ts`
- `backend/src/modules/approvals/approvals.service.ts`

**Frontend:**
- `frontend/app/(dashboard)/document-types/page.tsx`
- `frontend/app/(dashboard)/documents/page.tsx`
- `frontend/components/workflow/WorkflowPreview.tsx` (NEW)
- `frontend/components/workflow/WorkflowCustomizer.tsx` (NEW)
- `frontend/components/workflow/AdhocWorkflowBuilder.tsx` (NEW)

---

## 🚀 Ready to implement!

**Next Step**: Start with database migration

**Priority**: High (Core feature for Phase 2)

**Complexity**: Medium-High

**Risk**: Low (Well-defined requirements)
