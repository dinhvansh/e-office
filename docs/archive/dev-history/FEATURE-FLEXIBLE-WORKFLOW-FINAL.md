# Feature: Flexible Workflow System (Final Design)

## 📅 Planned: 2025-11-21
## ⏱️ Estimated: 4-5 hours

## 🎯 Mục tiêu

Hệ thống workflow linh hoạt với 3 chế độ:
1. **Không phê duyệt** - Tài liệu lưu trữ
2. **Workflow cố định** - Bắt buộc theo template
3. **Workflow linh hoạt** - Có template mặc định nhưng cho phép tùy chỉnh

---

## 📊 Document Type Configuration

### **Setup loại văn bản (Admin):**

```
┌─────────────────────────────────────────────────────┐
│ Loại văn bản: Hợp đồng                              │
├─────────────────────────────────────────────────────┤
│ Mã: HOP_DONG                                        │
│ Tên: Hợp đồng                                       │
│                                                      │
│ ☑ Yêu cầu đánh số văn bản                          │
│ ☑ Yêu cầu phê duyệt                                │
│ ☐ Yêu cầu ký số                                     │
│                                                      │
│ Quy trình phê duyệt mặc định:                       │
│ [Phê duyệt hợp đồng (3 bước)          ▼]          │
│                                                      │
│ ☑ Cho phép tùy chỉnh luồng ký khi trình           │
│   (User có thể sửa/thêm/bớt người ký)             │
│                                                      │
│ [Lưu]  [Hủy]                                       │
└─────────────────────────────────────────────────────┘
```

---

## 🔧 Database Schema

### **document_types table:**
```prisma
model document_types {
  id                      Int       @id @default(autoincrement())
  tenant_id               Int
  code                    String
  name                    String
  description             String?
  
  // Existing
  require_numbering       Boolean   @default(true)
  require_digital_signing Boolean   @default(false)
  
  // NEW - Workflow settings
  require_approval        Boolean   @default(false)
  default_workflow_id     Int?
  allow_workflow_override Boolean   @default(false)  // NEW!
  
  category                String?
  is_active               Boolean   @default(true)
  created_at              DateTime  @default(now())
  
  tenant                  tenants   @relation(fields: [tenant_id], references: [id])
  documents               documents[]
  numbering_rules         numbering_rules[]
  workflows               workflows[]
  default_workflow        workflows? @relation("default_workflow", fields: [default_workflow_id], references: [id])
  
  @@unique([tenant_id, code])
}
```

### **workflows table:**
```prisma
model workflows {
  id                Int       @id @default(autoincrement())
  tenant_id         Int
  name              String
  description       String?
  document_type_id  Int?
  
  // NEW - Workflow type
  is_template       Boolean   @default(true)   // false = ad-hoc
  created_for_doc   Int?                        // document_id (for ad-hoc)
  based_on_template Int?                        // template_id (for customized)
  
  is_active         Boolean   @default(true)
  created_by        Int?
  created_at        DateTime  @default(now())
  
  tenant            tenants   @relation(fields: [tenant_id], references: [id])
  document_type     document_types? @relation(fields: [document_type_id], references: [id])
  steps             workflow_steps[]
  instances         workflow_instances[]
  approvals         document_approvals[]
  
  // Relations
  document          documents? @relation("adhoc_workflow", fields: [created_for_doc], references: [id])
  template          workflows? @relation("customized_from", fields: [based_on_template], references: [id])
  customized        workflows[] @relation("customized_from")
  as_default        document_types[] @relation("default_workflow")
  
  @@unique([tenant_id, name])
}
```

---

## 🎨 4 Chế độ Workflow

### **Chế độ 1: Không phê duyệt**
```
Document Type Setup:
☐ Yêu cầu phê duyệt

Upload UI:
→ Không hiện phần workflow
→ Upload → Status: active
```

### **Chế độ 2: Workflow cố định (Strict)**
```
Document Type Setup:
☑ Yêu cầu phê duyệt
[Phê duyệt hợp đồng ▼]  ← Có chọn workflow
☐ Cho phép tùy chỉnh luồng ký

Upload UI:
→ Hiện thông báo: "Sẽ dùng quy trình: Phê duyệt hợp đồng"
→ Không cho sửa
→ Upload → Auto-submit với template
```

### **Chế độ 3: Workflow linh hoạt (Flexible)**
```
Document Type Setup:
☑ Yêu cầu phê duyệt
[Phê duyệt hợp đồng ▼]  ← Có chọn workflow
☑ Cho phép tùy chỉnh luồng ký

Upload UI:
→ Hiện workflow mặc định
→ Cho phép: Sửa người ký, Thêm bước, Xóa bước
→ Upload → Submit với workflow đã tùy chỉnh
```

### **Chế độ 4: Tự tạo workflow (Ad-hoc) - MỚI!**
```
Document Type Setup:
☑ Yêu cầu phê duyệt
[-- Không chọn workflow --]  ← KHÔNG chọn workflow
☐ Cho phép tùy chỉnh luồng ký (disabled)

Upload UI:
→ Hiện form trống để tạo workflow
→ User phải điền tay: Chọn người ký từng bước
→ Upload → Submit với ad-hoc workflow
```

---

## 🎨 Upload UI - 3 Scenarios

### **Scenario 1: Không phê duyệt**
```
┌─────────────────────────────────────────────┐
│ Loại văn bản: [Tài liệu tham khảo    ▼]   │
│                                              │
│ (Không hiện phần workflow)                  │
│                                              │
│ [Chọn file PDF...]                          │
│ [Upload]                                     │
└─────────────────────────────────────────────┘
```

---

### **Scenario 2: Workflow cố định**
```
┌─────────────────────────────────────────────┐
│ Loại văn bản: [Hợp đồng              ▼]   │
│                                              │
│ ┌─────────────────────────────────────────┐│
│ │ ℹ️ Quy trình phê duyệt bắt buộc        ││
│ │                                          ││
│ │ Văn bản này sẽ được gửi đến quy trình: ││
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
```

---

### **Scenario 3: Workflow linh hoạt**
```
┌─────────────────────────────────────────────┐
│ Loại văn bản: [Công văn đi           ▼]   │
│                                              │
│ ┌─────────────────────────────────────────┐│
│ │ 📝 Quy trình phê duyệt                  ││
│ │                                          ││
│ │ Quy trình mặc định: "Phê duyệt 2 cấp"  ││
│ │ (Bạn có thể tùy chỉnh luồng ký)        ││
│ │                                          ││
│ │ Bước 1:                                 ││
│ │ [Nguyễn Văn A - Manager      ▼] [X]    ││
│ │ Thời hạn: [3] ngày                      ││
│ │                                          ││
│ │ Bước 2:                                 ││
│ │ [Trần Thị B - Director       ▼] [X]    ││
│ │ Thời hạn: [5] ngày                      ││
│ │                                          ││
│ │ [+ Thêm bước]                           ││
│ │ [↻ Khôi phục mặc định]                 ││
│ └─────────────────────────────────────────┘│
│                                              │
│ [Chọn file PDF...]                          │
│ [Upload & Trình ký]                         │
└─────────────────────────────────────────────┘
```

---

## 🔄 Workflow Logic

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
  
  // 3. Handle workflow
  if (!docType.require_approval) {
    // No approval needed
    return document;
  }
  
  if (!docType.allow_workflow_override) {
    // Strict: Use template as-is
    await this.approvalsService.submitForApproval(
      document.id,
      docType.default_workflow_id,
      tenantId,
      userId
    );
  } else {
    // Flexible: Use customized workflow
    if (data.customized_steps) {
      // Create customized workflow
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
  }
  
  return document;
}
```

### **Create Customized Workflow:**
```typescript
async createCustomizedWorkflow(templateId, customSteps, documentId, tenantId, userId) {
  // 1. Get template
  const template = await this.workflowRepo.findById(templateId);
  
  // 2. Create customized workflow
  const workflow = await this.workflowRepo.create({
    tenant_id: tenantId,
    name: `${template.name} (Tùy chỉnh cho #${documentId})`,
    description: `Customized from: ${template.name}`,
    is_template: false,
    created_for_doc: documentId,
    based_on_template: templateId,
    created_by: userId,
  });
  
  // 3. Create steps
  for (let i = 0; i < customSteps.length; i++) {
    await this.workflowStepRepo.create({
      workflow_id: workflow.id,
      step_order: i + 1,
      step_name: customSteps[i].step_name || `Bước ${i + 1}`,
      approver_type: customSteps[i].approver_type,
      approver_id: customSteps[i].approver_id,
      due_in_days: customSteps[i].due_in_days,
    });
  }
  
  return workflow;
}
```

---

## 📋 Document Type Examples

| Loại văn bản | Require Approval | Default Workflow | Allow Override | Behavior |
|--------------|------------------|------------------|----------------|----------|
| Tài liệu tham khảo | ❌ No | - | - | No approval |
| Biểu mẫu | ❌ No | - | - | No approval |
| Hợp đồng | ✅ Yes | Phê duyệt hợp đồng | ❌ No | Strict template |
| Quyết định | ✅ Yes | Phê duyệt 2 cấp | ❌ No | Strict template |
| Công văn đi | ✅ Yes | Phê duyệt đơn giản | ✅ Yes | Flexible |
| Công văn đến | ✅ Yes | Phê duyệt đơn giản | ✅ Yes | Flexible |
| Đề xuất | ✅ Yes | (Không chọn) | - | Ad-hoc (tự tạo) |
| Báo cáo | ✅ Yes | (Không chọn) | - | Ad-hoc (tự tạo) |
| Thông báo | ✅ Yes | (Không chọn) | - | Ad-hoc (tự tạo) |

---

## 🎯 Use Cases

### **Use Case 1: Hợp đồng (Strict)**
```
Admin Setup:
- Loại: Hợp đồng
- ☑ Yêu cầu phê duyệt
- Workflow: "Phê duyệt hợp đồng (3 bước)"
- ☐ Cho phép tùy chỉnh (UNCHECKED)

User Upload:
- Chọn loại: Hợp đồng
- Thấy thông báo: "Quy trình bắt buộc: Phê duyệt hợp đồng"
- Không thể sửa
- Upload → Auto-submit với template
```

### **Use Case 2: Công văn đi (Flexible)**
```
Admin Setup:
- Loại: Công văn đi
- ☑ Yêu cầu phê duyệt
- Workflow: "Phê duyệt 2 cấp"
- ☑ Cho phép tùy chỉnh (CHECKED)

User Upload:
- Chọn loại: Công văn đi
- Thấy workflow mặc định:
  - Bước 1: Manager (3 ngày)
  - Bước 2: Director (5 ngày)
- Có thể:
  - Sửa người ký: Manager → Nguyễn Văn A
  - Thêm bước: Bước 3: CFO (7 ngày)
  - Xóa bước: Xóa bước 2
  - Khôi phục mặc định
- Upload → Submit với workflow đã tùy chỉnh
```

### **Use Case 3: Tài liệu tham khảo (No Approval)**
```
Admin Setup:
- Loại: Tài liệu tham khảo
- ☐ Yêu cầu phê duyệt (UNCHECKED)

User Upload:
- Chọn loại: Tài liệu tham khảo
- Không hiện phần workflow
- Upload → Active (Done)
```

---

## 📝 Implementation Checklist

### **Phase 1: Database (30 mins)**
- [ ] Add `require_approval` to document_types
- [ ] Add `default_workflow_id` to document_types
- [ ] Add `allow_workflow_override` to document_types
- [ ] Add `is_template` to workflows
- [ ] Add `created_for_doc` to workflows
- [ ] Add `based_on_template` to workflows
- [ ] Run migration

### **Phase 2: Backend (2 hours)**
- [ ] Update `documentTypes.service.ts`
- [ ] Update `documents.service.ts`
  - [ ] Add `createCustomizedWorkflow()`
  - [ ] Update `createDocument()` logic
- [ ] Update `approvals.service.ts`
- [ ] Add validation logic
- [ ] Test API endpoints

### **Phase 3: Frontend - Document Types (1 hour)**
- [ ] Update Document Types page
  - [ ] Add "Yêu cầu phê duyệt" checkbox
  - [ ] Add "Quy trình mặc định" dropdown
  - [ ] Add "Cho phép tùy chỉnh" checkbox (conditional)
- [ ] Update form validation

### **Phase 4: Frontend - Documents Upload (2 hours)**
- [ ] Create `WorkflowPreview` component (strict mode)
- [ ] Create `WorkflowCustomizer` component (flexible mode)
- [ ] Update Documents Upload page
  - [ ] Conditional rendering based on document type
  - [ ] Add/Remove/Edit steps logic
  - [ ] Restore default button
- [ ] Update upload mutation

### **Phase 5: Testing (30 mins)**
- [ ] Test strict workflow
- [ ] Test flexible workflow
- [ ] Test no approval
- [ ] Test validation

---

## 📊 Estimated Effort

| Task | Time |
|------|------|
| Database schema | 30 mins |
| Backend logic | 2 hours |
| Frontend - Document Types | 1 hour |
| Frontend - Upload | 2 hours |
| Testing | 30 mins |
| **Total** | **6 hours** |

---

## 🎉 Benefits

### **For Admins:**
- ✅ Kiểm soát: Quyết định loại nào cho phép tùy chỉnh
- ✅ Linh hoạt: Cân bằng giữa strict và flexible
- ✅ Audit: Track được workflow customization

### **For Users:**
- ✅ Rõ ràng: Biết loại nào có thể tùy chỉnh
- ✅ Linh hoạt: Sửa workflow khi cần
- ✅ Nhanh chóng: Có template mặc định sẵn

---

## 🔗 Related Files

**Backend:**
- `backend/prisma/schema.prisma`
- `backend/src/modules/documentTypes/documentTypes.service.ts`
- `backend/src/modules/documents/documents.service.ts`
- `backend/src/modules/workflows/workflows.service.ts`

**Frontend:**
- `frontend/app/(dashboard)/document-types/page.tsx`
- `frontend/app/(dashboard)/documents/page.tsx`
- `frontend/components/workflow/WorkflowPreview.tsx` (NEW)
- `frontend/components/workflow/WorkflowCustomizer.tsx` (NEW)

---

**Ready to implement!** 🚀

**Next**: Add 3 new fields to document_types schema
