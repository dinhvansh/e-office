# Feature: Enhanced Document Management - Archive vs Approval

## 📅 Planned: 2025-11-21
## ⏱️ Estimated: 2-3 hours

## 🎯 Mục tiêu

Phân biệt rõ 2 loại tài liệu:
1. **Tài liệu lưu trữ** - Chỉ cần upload và lưu trữ
2. **Tài liệu cần phê duyệt** - Phải qua workflow approval

## 📊 Phân tích hiện trạng

### **Hiện tại:**
- ✅ Có document_types với `require_digital_signing`
- ✅ Có workflow system
- ❌ Không có `require_approval` flag
- ❌ UI không phân biệt 2 loại
- ❌ Upload form không tự động xử lý

### **Vấn đề:**
1. User phải chọn workflow thủ công mỗi lần upload
2. Không biết loại nào cần phê duyệt, loại nào không
3. Dễ quên trình ký văn bản quan trọng

---

## 🔧 Giải pháp đề xuất

### **1. Database Schema (30 mins)**

#### Thêm field vào `document_types`:
```prisma
model document_types {
  // ... existing fields
  require_approval        Boolean   @default(false)  // NEW
  default_workflow_id     Int?                       // NEW
  
  // ... existing relations
  default_workflow        workflows? @relation("default_workflow", fields: [default_workflow_id], references: [id])
}
```

#### Migration:
```sql
ALTER TABLE document_types 
ADD COLUMN require_approval BOOLEAN DEFAULT false,
ADD COLUMN default_workflow_id INT REFERENCES workflows(id);
```

---

### **2. Backend Logic (1 hour)**

#### Update `documentTypes.service.ts`:
```typescript
async createDocumentType(data) {
  return this.repo.create({
    ...data,
    require_approval: data.require_approval || false,
    default_workflow_id: data.default_workflow_id || null,
  });
}
```

#### Update `documents.service.ts`:
```typescript
async createDocument(data, userId, tenantId) {
  // Get document type
  const docType = await this.docTypeRepo.findById(data.document_type_id);
  
  // Create document
  const document = await this.repo.create({
    ...data,
    tenant_id: tenantId,
    owner_id: userId,
    status: docType.require_approval ? 'draft' : 'active',
  });
  
  // Auto-submit for approval if required
  if (docType.require_approval && docType.default_workflow_id) {
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

### **3. Frontend UI (1 hour)**

#### Update Document Types Page:
```tsx
// Add checkbox "Yêu cầu phê duyệt"
<Checkbox
  checked={requireApproval}
  onChange={(e) => setRequireApproval(e.target.checked)}
>
  Yêu cầu phê duyệt
</Checkbox>

// Add workflow dropdown (conditional)
{requireApproval && (
  <Select
    label="Quy trình phê duyệt mặc định"
    options={workflows}
    value={defaultWorkflowId}
    onChange={setDefaultWorkflowId}
  />
)}
```

#### Update Documents Upload Page:
```tsx
// Remove workflow dropdown from upload form
// (Auto-handled by document type)

// Show info message
{selectedDocType?.require_approval && (
  <Alert variant="info">
    ℹ️ Loại văn bản này yêu cầu phê duyệt. 
    Sau khi upload, văn bản sẽ tự động được gửi đến 
    quy trình: {selectedDocType.default_workflow?.name}
  </Alert>
)}
```

---

## 📋 Use Cases

### **Use Case 1: Tài liệu lưu trữ (Archive)**

**Setup (Admin):**
```
1. Vào /document-types
2. Tạo loại: "Tài liệu tham khảo"
3. ☐ Yêu cầu phê duyệt (UNCHECKED)
4. Lưu
```

**User Upload:**
```
1. Vào /documents
2. Chọn loại: "Tài liệu tham khảo"
3. Upload file
4. ✅ Xong! Status: active (không cần phê duyệt)
```

---

### **Use Case 2: Tài liệu cần phê duyệt (Approval)**

**Setup (Admin):**
```
1. Vào /document-types
2. Tạo loại: "Hợp đồng"
3. ☑ Yêu cầu phê duyệt (CHECKED)
4. Chọn workflow: "Phê duyệt hợp đồng (3 bước)"
5. Lưu
```

**User Upload:**
```
1. Vào /documents
2. Chọn loại: "Hợp đồng"
3. Thấy thông báo: "Loại văn bản này yêu cầu phê duyệt"
4. Upload file
5. ✅ Tự động trình ký! Status: pending_approval
6. Người phê duyệt nhận email
```

---

## 🎨 UI Mockup

### **Document Types Page:**
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
│ [Lưu]  [Hủy]                                       │
└─────────────────────────────────────────────────────┘
```

### **Documents Upload Page:**
```
┌─────────────────────────────────────────────────────┐
│ Upload tài liệu mới                                 │
├─────────────────────────────────────────────────────┤
│ Loại văn bản: [Hợp đồng                    ▼]     │
│                                                      │
│ ┌─────────────────────────────────────────────┐   │
│ │ ℹ️ Loại văn bản này yêu cầu phê duyệt       │   │
│ │                                              │   │
│ │ Sau khi upload, văn bản sẽ tự động được     │   │
│ │ gửi đến quy trình:                          │   │
│ │ "Phê duyệt hợp đồng (3 bước)"              │   │
│ └─────────────────────────────────────────────┘   │
│                                                      │
│ [Chọn file PDF...]                                  │
│                                                      │
│ [Upload]                                            │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Document Type Examples

| Loại văn bản | Require Approval | Default Workflow | Status sau upload |
|--------------|------------------|------------------|-------------------|
| Tài liệu tham khảo | ❌ No | - | active |
| Biểu mẫu | ❌ No | - | active |
| Hướng dẫn | ❌ No | - | active |
| Công văn đến | ✅ Yes | Phê duyệt đơn giản | pending_approval |
| Công văn đi | ✅ Yes | Phê duyệt 2 cấp | pending_approval |
| Hợp đồng | ✅ Yes | Phê duyệt hợp đồng | pending_approval |
| Quyết định | ✅ Yes | Phê duyệt 2 cấp | pending_approval |
| Thông báo | ❌ No | - | active |

---

## 🔄 Workflow Logic

### **Scenario 1: Archive Document (No Approval)**
```
Upload → Status: active → Done ✅
```

### **Scenario 2: Approval Document (Auto-submit)**
```
Upload → Status: draft → Auto-submit → Status: pending_approval → Workflow starts ✅
```

### **Scenario 3: Approval Document (Manual submit)**
```
Upload → Status: draft → User clicks "Trình ký" → Status: pending_approval → Workflow starts ✅
```

---

## 🎯 Benefits

### **For Users:**
- ✅ Không cần nhớ loại nào cần phê duyệt
- ✅ Tự động trình ký (không quên)
- ✅ Upload nhanh hơn (ít bước)
- ✅ Rõ ràng hơn (thông báo trước)

### **For Admins:**
- ✅ Cấu hình tập trung (document types)
- ✅ Dễ quản lý quy trình
- ✅ Thay đổi workflow dễ dàng
- ✅ Audit trail rõ ràng

---

## 📝 Implementation Checklist

### **Phase 1: Database (30 mins)**
- [ ] Add `require_approval` field to document_types
- [ ] Add `default_workflow_id` field to document_types
- [ ] Run migration
- [ ] Update seed script

### **Phase 2: Backend (1 hour)**
- [ ] Update `documentTypes.service.ts`
- [ ] Update `documentTypes.controller.ts`
- [ ] Update `documents.service.ts` (auto-submit logic)
- [ ] Add validation (require_approval = true → must have default_workflow_id)
- [ ] Test API endpoints

### **Phase 3: Frontend (1 hour)**
- [ ] Update Document Types page
  - [ ] Add "Yêu cầu phê duyệt" checkbox
  - [ ] Add "Quy trình mặc định" dropdown (conditional)
- [ ] Update Documents Upload page
  - [ ] Remove workflow dropdown (optional now)
  - [ ] Add info alert (when require_approval = true)
  - [ ] Update upload logic
- [ ] Update Documents List page
  - [ ] Show badge "Tự động phê duyệt" for auto-submitted docs

### **Phase 4: Testing (30 mins)**
- [ ] Test archive document upload
- [ ] Test approval document upload (auto-submit)
- [ ] Test approval document upload (manual submit)
- [ ] Test document type CRUD
- [ ] Test validation

---

## 🚀 Migration Strategy

### **For Existing Document Types:**
```sql
-- Set default values
UPDATE document_types 
SET require_approval = false 
WHERE require_approval IS NULL;

-- Mark approval types
UPDATE document_types 
SET require_approval = true 
WHERE code IN ('CV_DEN', 'CV_DI', 'HOP_DONG', 'QUYET_DINH');

-- Set default workflows (if exists)
UPDATE document_types dt
SET default_workflow_id = (
  SELECT w.id FROM workflows w 
  WHERE w.document_type_id = dt.id 
  LIMIT 1
)
WHERE require_approval = true;
```

---

## 🎯 Success Criteria

### **Must Have:**
- [x] `require_approval` field in document_types
- [x] `default_workflow_id` field in document_types
- [x] Auto-submit logic when upload
- [x] UI checkbox in document types page
- [x] Info alert in upload page

### **Should Have:**
- [x] Validation (require_approval = true → must have workflow)
- [x] Migration script for existing data
- [x] Test cases

### **Nice to Have:**
- [ ] Badge "Tự động phê duyệt" in documents list
- [ ] Statistics (% documents auto-approved)
- [ ] Workflow change history

---

## 📊 Estimated Effort

| Task | Time |
|------|------|
| Database schema | 30 mins |
| Backend logic | 1 hour |
| Frontend UI | 1 hour |
| Testing | 30 mins |
| **Total** | **3 hours** |

---

## 🔗 Related Files

**Backend:**
- `backend/prisma/schema.prisma`
- `backend/src/modules/documentTypes/documentTypes.service.ts`
- `backend/src/modules/documents/documents.service.ts`

**Frontend:**
- `frontend/app/(dashboard)/document-types/page.tsx`
- `frontend/app/(dashboard)/documents/page.tsx`

**Docs:**
- `docs/dev/FEATURE-SUBMIT-FOR-APPROVAL-UI.md`
- `PHASE-2-PLAN.md`

---

## 💡 Future Enhancements

### **Phase 3+:**
- [ ] Multiple workflows per document type (user chooses)
- [ ] Conditional workflows (based on amount, department, etc.)
- [ ] Workflow templates library
- [ ] Approval SLA tracking
- [ ] Auto-escalation when overdue

---

**Ready to implement!** 🚀

**Next**: Add `require_approval` field to document_types schema
