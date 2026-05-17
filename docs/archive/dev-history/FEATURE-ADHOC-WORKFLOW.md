# Feature: Ad-hoc Workflow (Luồng ký thủ công)

## 📅 Planned: 2025-11-21
## ⏱️ Estimated: 3-4 hours

## 🎯 Mục tiêu

Cho phép user tạo luồng ký tạm thời (ad-hoc) ngay khi upload document, không cần dùng workflow template có sẵn.

## 📊 3 Loại Workflow

### **1. Workflow Template (Đã có)**
- Admin tạo sẵn template
- Gắn vào document type
- Tự động áp dụng khi upload
- **Ví dụ:** "Phê duyệt hợp đồng (3 bước)"

### **2. Ad-hoc Workflow (MỚI - Cần làm)**
- User tạo tạm thời khi upload
- Chọn người ký từng bước
- Không lưu thành template
- **Ví dụ:** Upload → Chọn: Nguyễn Văn A → Trần Thị B → Lê Văn C

### **3. No Workflow (Đã có)**
- Tài liệu lưu trữ
- Không cần phê duyệt
- **Ví dụ:** Tài liệu tham khảo, biểu mẫu

---

## 🎨 UI Flow: Ad-hoc Workflow

### **Upload Document Page:**

```
┌─────────────────────────────────────────────────────────┐
│ Upload tài liệu mới                                     │
├─────────────────────────────────────────────────────────┤
│ Loại văn bản: [Công văn đi                      ▼]    │
│                                                          │
│ Quy trình phê duyệt:                                    │
│ ○ Không cần phê duyệt                                  │
│ ● Sử dụng quy trình mặc định: "Phê duyệt 2 cấp"       │
│ ○ Tạo luồng ký thủ công                               │
│                                                          │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 📝 Luồng ký thủ công                            │   │
│ │                                                  │   │
│ │ Bước 1:                                         │   │
│ │ [Chọn người ký                            ▼] [X]│   │
│ │ Thời hạn: [3] ngày                              │   │
│ │                                                  │   │
│ │ Bước 2:                                         │   │
│ │ [Chọn người ký                            ▼] [X]│   │
│ │ Thời hạn: [5] ngày                              │   │
│ │                                                  │   │
│ │ [+ Thêm bước]                                   │   │
│ └─────────────────────────────────────────────────┘   │
│                                                          │
│ [Chọn file PDF...]                                      │
│                                                          │
│ [Upload & Trình ký]                                     │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### **1. Database Schema (30 mins)**

#### Thêm field vào `workflows`:
```prisma
model workflows {
  // ... existing fields
  is_template     Boolean   @default(true)   // NEW: false = ad-hoc
  created_for_doc Int?                        // NEW: document_id (for ad-hoc)
  
  // ... existing relations
  document        documents? @relation("adhoc_workflow", fields: [created_for_doc], references: [id])
}
```

**Logic:**
- `is_template = true` → Workflow template (reusable)
- `is_template = false` → Ad-hoc workflow (one-time use)

---

### **2. Backend API (1.5 hours)**

#### New Endpoint: Create Ad-hoc Workflow
```typescript
POST /api/v1/approvals/submit-adhoc

Request:
{
  "document_id": 10,
  "steps": [
    {
      "approver_user_id": 2,
      "due_in_days": 3
    },
    {
      "approver_user_id": 3,
      "due_in_days": 5
    }
  ]
}

Response:
{
  "workflow_id": 15,
  "instance_id": 8,
  "message": "Ad-hoc workflow created and submitted"
}
```

#### Service Logic:
```typescript
// approvals.service.ts
async submitAdhocWorkflow(documentId, steps, tenantId, userId) {
  // 1. Create ad-hoc workflow
  const workflow = await this.workflowRepo.create({
    tenant_id: tenantId,
    name: `Ad-hoc workflow for Document #${documentId}`,
    is_template: false,
    created_for_doc: documentId,
    created_by: userId,
  });
  
  // 2. Create workflow steps
  for (let i = 0; i < steps.length; i++) {
    await this.workflowStepRepo.create({
      workflow_id: workflow.id,
      step_order: i + 1,
      step_name: `Bước ${i + 1}`,
      approver_type: 'user',
      approver_id: steps[i].approver_user_id,
      due_in_days: steps[i].due_in_days,
    });
  }
  
  // 3. Submit for approval (existing logic)
  return this.submitForApproval(documentId, workflow.id, tenantId, userId);
}
```

---

### **3. Frontend UI (2 hours)**

#### Component: `AdhocWorkflowBuilder.tsx`
```tsx
interface AdhocStep {
  approver_user_id: number;
  due_in_days: number;
}

export function AdhocWorkflowBuilder() {
  const [steps, setSteps] = useState<AdhocStep[]>([
    { approver_user_id: 0, due_in_days: 3 }
  ]);
  
  const addStep = () => {
    setSteps([...steps, { approver_user_id: 0, due_in_days: 3 }]);
  };
  
  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };
  
  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...steps];
    newSteps[index][field] = value;
    setSteps(newSteps);
  };
  
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">📝 Luồng ký thủ công</h3>
      
      {steps.map((step, index) => (
        <div key={index} className="flex gap-3 items-start">
          <div className="flex-1 space-y-2">
            <Label>Bước {index + 1}</Label>
            <Select
              value={step.approver_user_id}
              onChange={(e) => updateStep(index, 'approver_user_id', Number(e.target.value))}
            >
              <option value="">-- Chọn người ký --</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name} ({user.email})
                </option>
              ))}
            </Select>
            
            <div className="flex gap-2 items-center">
              <Label>Thời hạn:</Label>
              <Input
                type="number"
                value={step.due_in_days}
                onChange={(e) => updateStep(index, 'due_in_days', Number(e.target.value))}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">ngày</span>
            </div>
          </div>
          
          {steps.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeStep(index)}
              className="mt-6"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      ))}
      
      <Button
        variant="outline"
        onClick={addStep}
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-2" />
        Thêm bước
      </Button>
    </div>
  );
}
```

#### Update Documents Upload Page:
```tsx
const [workflowMode, setWorkflowMode] = useState<'none' | 'template' | 'adhoc'>('none');
const [adhocSteps, setAdhocSteps] = useState<AdhocStep[]>([]);

// Upload mutation
const uploadMutation = useMutation({
  mutationFn: async () => {
    // 1. Upload document
    const doc = await uploadDocument();
    
    // 2. Submit for approval
    if (workflowMode === 'template' && selectedWorkflowId) {
      await submitForApproval(doc.id, selectedWorkflowId);
    } else if (workflowMode === 'adhoc') {
      await submitAdhocWorkflow(doc.id, adhocSteps);
    }
    
    return doc;
  }
});
```

---

## 📋 Use Cases

### **Use Case 1: Workflow Template (Existing)**
```
1. Admin setup: Hợp đồng → "Phê duyệt hợp đồng (3 bước)"
2. User upload: Chọn loại "Hợp đồng"
3. ● Sử dụng quy trình mặc định
4. Upload → Tự động trình ký ✅
```

### **Use Case 2: Ad-hoc Workflow (NEW)**
```
1. User upload: Chọn loại "Công văn đi"
2. ○ Tạo luồng ký thủ công
3. Thêm bước:
   - Bước 1: Nguyễn Văn A (3 ngày)
   - Bước 2: Trần Thị B (5 ngày)
   - Bước 3: Lê Văn C (7 ngày)
4. Upload → Trình ký với luồng tạm thời ✅
```

### **Use Case 3: No Workflow (Existing)**
```
1. User upload: Chọn loại "Tài liệu tham khảo"
2. ○ Không cần phê duyệt
3. Upload → Active ✅
```

---

## 🎯 Workflow Decision Tree

```
Upload Document
    │
    ├─ Document Type có require_approval?
    │   │
    │   ├─ NO → Status: active (Done)
    │   │
    │   └─ YES → User chọn:
    │       │
    │       ├─ ● Workflow mặc định
    │       │   → Submit với template
    │       │
    │       ├─ ○ Luồng ký thủ công
    │       │   → Tạo ad-hoc workflow
    │       │   → Submit
    │       │
    │       └─ ○ Không phê duyệt (override)
    │           → Status: active
```

---

## 📊 Comparison: Template vs Ad-hoc

| Feature | Template Workflow | Ad-hoc Workflow |
|---------|-------------------|-----------------|
| **Tạo bởi** | Admin | User |
| **Lưu trữ** | Reusable | One-time |
| **Sử dụng** | Nhiều documents | 1 document |
| **Chỉnh sửa** | Có thể sửa template | Không thể sửa |
| **Use case** | Quy trình cố định | Quy trình đặc biệt |
| **Ví dụ** | "Phê duyệt hợp đồng" | "Hợp đồng đặc biệt X" |

---

## 🔒 Security & Validation

### **Backend Validation:**
```typescript
// Validate ad-hoc workflow
if (steps.length === 0) {
  throw new Error('Phải có ít nhất 1 bước');
}

if (steps.length > 10) {
  throw new Error('Tối đa 10 bước');
}

// Validate approvers exist
for (const step of steps) {
  const user = await this.userRepo.findById(step.approver_user_id);
  if (!user || user.tenant_id !== tenantId) {
    throw new Error('Người ký không hợp lệ');
  }
}

// Validate due_in_days
for (const step of steps) {
  if (step.due_in_days < 1 || step.due_in_days > 365) {
    throw new Error('Thời hạn phải từ 1-365 ngày');
  }
}
```

---

## 📝 Implementation Checklist

### **Phase 1: Database (30 mins)**
- [ ] Add `is_template` field to workflows
- [ ] Add `created_for_doc` field to workflows
- [ ] Run migration
- [ ] Update seed script

### **Phase 2: Backend (1.5 hours)**
- [ ] Create `submitAdhocWorkflow()` service
- [ ] Add validation logic
- [ ] Create API endpoint `POST /approvals/submit-adhoc`
- [ ] Test API

### **Phase 3: Frontend (2 hours)**
- [ ] Create `AdhocWorkflowBuilder` component
- [ ] Update Documents Upload page
  - [ ] Add radio buttons (none/template/adhoc)
  - [ ] Conditional rendering
  - [ ] Integrate AdhocWorkflowBuilder
- [ ] Add user dropdown (fetch users)
- [ ] Add/Remove step logic
- [ ] Update upload mutation

### **Phase 4: Testing (30 mins)**
- [ ] Test ad-hoc workflow creation
- [ ] Test approval flow with ad-hoc
- [ ] Test validation (empty steps, invalid users)
- [ ] Test UI (add/remove steps)

---

## 🎨 UI States

### **State 1: No Approval**
```
○ Không cần phê duyệt
```

### **State 2: Template Workflow**
```
● Sử dụng quy trình mặc định: "Phê duyệt 2 cấp"
```

### **State 3: Ad-hoc Workflow**
```
○ Tạo luồng ký thủ công

┌─────────────────────────────────┐
│ Bước 1: [Nguyễn Văn A    ▼] [X]│
│ Thời hạn: [3] ngày              │
│                                  │
│ Bước 2: [Trần Thị B      ▼] [X]│
│ Thời hạn: [5] ngày              │
│                                  │
│ [+ Thêm bước]                   │
└─────────────────────────────────┘
```

---

## 🚀 Benefits

### **For Users:**
- ✅ Linh hoạt: Tạo luồng ký đặc biệt khi cần
- ✅ Nhanh chóng: Không cần admin tạo template
- ✅ Kiểm soát: Chọn chính xác người ký
- ✅ Đơn giản: UI trực quan, dễ dùng

### **For Admins:**
- ✅ Giảm tải: User tự xử lý case đặc biệt
- ✅ Linh hoạt: Không cần tạo template cho mọi case
- ✅ Audit: Vẫn track được ad-hoc workflows

---

## 📊 Estimated Effort

| Task | Time |
|------|------|
| Database schema | 30 mins |
| Backend API | 1.5 hours |
| Frontend UI | 2 hours |
| Testing | 30 mins |
| **Total** | **4.5 hours** |

---

## 🔗 Related Features

**Depends on:**
- ✅ Workflow system (Phase 2)
- ✅ Approval system (Phase 2)
- ✅ User management (Phase 1)

**Enables:**
- 🔜 Workflow delegation
- 🔜 Workflow templates from ad-hoc
- 🔜 Workflow analytics

---

## 💡 Future Enhancements

### **Phase 3+:**
- [ ] Save ad-hoc as template (convert)
- [ ] Clone workflow from previous document
- [ ] Suggest approvers (AI/ML)
- [ ] Parallel approval in ad-hoc
- [ ] Conditional steps in ad-hoc

---

**Ready to implement!** 🚀

**Next**: Add `is_template` and `created_for_doc` fields to workflows schema
