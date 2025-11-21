# Phase 2: Backend Implementation Guide

## 📅 Date: 2025-11-21
## ⏱️ Estimated: 2.5 hours
## 🎯 Goal: Implement 4-mode workflow logic

---

## 📋 Overview

Implement backend logic to support 4 workflow modes:
1. No Approval
2. Strict Workflow
3. Flexible Workflow
4. Ad-hoc Workflow

---

## 🔧 Files to Modify

### 1. documents.service.ts (Main Logic)
### 2. workflows.service.ts (Helper Methods)
### 3. approvals.service.ts (Minor Updates)
### 4. documents.controller.ts (API Updates)

---

## 📝 Implementation Details

### **1. documents.service.ts**

#### Add Helper Methods:

```typescript
// backend/src/modules/documents/documents.service.ts

/**
 * Create ad-hoc workflow from user-provided steps
 */
async createAdhocWorkflow(
  steps: Array<{ approver_user_id: number; due_in_days: number }>,
  documentId: number,
  tenantId: number,
  userId: number
) {
  // Validate steps
  if (!steps || steps.length === 0) {
    throw new AppError('AD_HOC_STEPS_REQUIRED', 400, 'Phải có ít nhất 1 bước phê duyệt');
  }

  if (steps.length > 10) {
    throw new AppError('TOO_MANY_STEPS', 400, 'Tối đa 10 bước');
  }

  // Validate approvers exist and belong to tenant
  for (const step of steps) {
    const user = await prisma.users.findFirst({
      where: {
        id: step.approver_user_id,
        tenant_id: tenantId,
      },
    });

    if (!user) {
      throw new AppError('INVALID_APPROVER', 400, 'Người phê duyệt không hợp lệ');
    }

    if (step.due_in_days < 1 || step.due_in_days > 365) {
      throw new AppError('INVALID_DUE_DAYS', 400, 'Thời hạn phải từ 1-365 ngày');
    }
  }

  // Create ad-hoc workflow
  const workflow = await prisma.workflows.create({
    data: {
      tenant_id: tenantId,
      name: `Ad-hoc workflow for Document #${documentId}`,
      description: 'User-created workflow',
      is_template: false,
      created_for_doc: documentId,
      created_by: userId,
      is_active: true,
    },
  });

  // Create workflow steps
  for (let i = 0; i < steps.length; i++) {
    await prisma.workflow_steps.create({
      data: {
        workflow_id: workflow.id,
        step_order: i + 1,
        step_name: `Bước ${i + 1}`,
        approver_type: 'user',
        approver_id: steps[i].approver_user_id,
        due_in_days: steps[i].due_in_days,
        is_required: true,
      },
    });
  }

  return workflow;
}

/**
 * Create customized workflow based on template
 */
async createCustomizedWorkflow(
  templateId: number,
  customSteps: Array<{
    step_name?: string;
    approver_type: string;
    approver_id: number;
    due_in_days: number;
  }>,
  documentId: number,
  tenantId: number,
  userId: number
) {
  // Get template
  const template = await prisma.workflows.findFirst({
    where: {
      id: templateId,
      tenant_id: tenantId,
      is_template: true,
    },
  });

  if (!template) {
    throw new AppError('TEMPLATE_NOT_FOUND', 404, 'Workflow template không tồn tại');
  }

  // Validate custom steps
  if (!customSteps || customSteps.length === 0) {
    throw new AppError('CUSTOM_STEPS_REQUIRED', 400, 'Phải có ít nhất 1 bước');
  }

  // Create customized workflow
  const workflow = await prisma.workflows.create({
    data: {
      tenant_id: tenantId,
      name: `${template.name} (Tùy chỉnh cho #${documentId})`,
      description: `Customized from: ${template.name}`,
      is_template: false,
      created_for_doc: documentId,
      based_on_template: templateId,
      created_by: userId,
      is_active: true,
    },
  });

  // Create custom steps
  for (let i = 0; i < customSteps.length; i++) {
    await prisma.workflow_steps.create({
      data: {
        workflow_id: workflow.id,
        step_order: i + 1,
        step_name: customSteps[i].step_name || `Bước ${i + 1}`,
        approver_type: customSteps[i].approver_type,
        approver_id: customSteps[i].approver_id,
        due_in_days: customSteps[i].due_in_days,
        is_required: true,
      },
    });
  }

  return workflow;
}

/**
 * Update createDocument to handle 4 workflow modes
 */
async createDocument(data: any, userId: number, tenantId: number) {
  // 1. Get document type
  const docType = await prisma.document_types.findFirst({
    where: {
      id: data.document_type_id,
      tenant_id: tenantId,
    },
    include: {
      default_workflow: true,
    },
  });

  if (!docType) {
    throw new AppError('DOCUMENT_TYPE_NOT_FOUND', 404, 'Loại văn bản không tồn tại');
  }

  // 2. Generate document number if required
  let documentNumber = null;
  if (docType.require_numbering) {
    documentNumber = await this.numberingService.generateNumberForDocument(
      data.document_type_id,
      tenantId
    );
  }

  // 3. Create document
  const document = await prisma.documents.create({
    data: {
      tenant_id: tenantId,
      owner_id: userId,
      document_type_id: data.document_type_id,
      file_path: data.file_path,
      original_file_name: data.original_file_name,
      title: data.title || data.original_file_name,
      document_number: documentNumber,
      status: docType.require_approval ? 'draft' : 'active',
      confidential_level: data.confidential_level || 'normal',
      visibility_scope: data.visibility_scope || 'public',
    },
  });

  // 4. Handle workflow based on mode
  if (!docType.require_approval) {
    // Mode 1: No Approval
    return document;
  }

  // Mode 4: Ad-hoc (No default workflow)
  if (!docType.default_workflow_id) {
    if (!data.adhoc_steps || data.adhoc_steps.length === 0) {
      throw new AppError(
        'AD_HOC_STEPS_REQUIRED',
        400,
        'Loại văn bản này yêu cầu tạo luồng ký thủ công'
      );
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

  // Mode 2: Strict (Use template as-is)
  if (!docType.allow_workflow_override) {
    await this.approvalsService.submitForApproval(
      document.id,
      docType.default_workflow_id,
      tenantId,
      userId
    );

    return document;
  }

  // Mode 3: Flexible (Use customized or default)
  if (data.customized_steps && data.customized_steps.length > 0) {
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

### **2. documents.controller.ts**

#### Update Create Document Endpoint:

```typescript
// backend/src/modules/documents/documents.controller.ts

async createDocument(req: Request, res: Response) {
  const userId = req.user!.id;
  const tenantId = req.user!.tenantId;

  // Validate request body
  const schema = z.object({
    file_name: z.string(),
    file_base64: z.string(),
    document_type_id: z.number(),
    title: z.string().optional(),
    confidential_level: z.enum(['normal', 'confidential', 'secret']).optional(),
    visibility_scope: z.enum(['public', 'department', 'private']).optional(),
    
    // Workflow options
    adhoc_steps: z.array(z.object({
      approver_user_id: z.number(),
      due_in_days: z.number().min(1).max(365),
    })).optional(),
    
    customized_steps: z.array(z.object({
      step_name: z.string().optional(),
      approver_type: z.enum(['user', 'role', 'department', 'manager']),
      approver_id: z.number(),
      due_in_days: z.number().min(1).max(365),
    })).optional(),
  });

  const data = schema.parse(req.body);

  // Save file
  const filePath = await this.storageHelper.saveBase64File(
    data.file_base64,
    data.file_name,
    tenantId
  );

  // Create document with workflow
  const document = await this.documentsService.createDocument(
    {
      ...data,
      file_path: filePath,
      original_file_name: data.file_name,
    },
    userId,
    tenantId
  );

  res.json({
    success: true,
    data: toDocumentDTO(document),
  });
}
```

---

### **3. documentTypes.service.ts**

#### Update CRUD to handle new fields:

```typescript
// backend/src/modules/documentTypes/documentTypes.service.ts

async createDocumentType(data: any, tenantId: number) {
  // Validate: if require_approval = true and allow_workflow_override = true
  // then default_workflow_id must be set
  if (data.require_approval && data.allow_workflow_override && !data.default_workflow_id) {
    throw new AppError(
      'WORKFLOW_REQUIRED',
      400,
      'Phải chọn quy trình mặc định khi cho phép tùy chỉnh'
    );
  }

  return prisma.document_types.create({
    data: {
      tenant_id: tenantId,
      code: data.code,
      name: data.name,
      description: data.description,
      require_numbering: data.require_numbering ?? true,
      require_digital_signing: data.require_digital_signing ?? false,
      require_approval: data.require_approval ?? false,
      default_workflow_id: data.default_workflow_id || null,
      allow_workflow_override: data.allow_workflow_override ?? false,
      category: data.category,
      is_active: data.is_active ?? true,
    },
  });
}

async updateDocumentType(id: number, data: any, tenantId: number) {
  // Same validation as create
  if (data.require_approval && data.allow_workflow_override && !data.default_workflow_id) {
    throw new AppError(
      'WORKFLOW_REQUIRED',
      400,
      'Phải chọn quy trình mặc định khi cho phép tùy chỉnh'
    );
  }

  return prisma.document_types.update({
    where: { id, tenant_id: tenantId },
    data: {
      code: data.code,
      name: data.name,
      description: data.description,
      require_numbering: data.require_numbering,
      require_digital_signing: data.require_digital_signing,
      require_approval: data.require_approval,
      default_workflow_id: data.default_workflow_id || null,
      allow_workflow_override: data.allow_workflow_override,
      category: data.category,
      is_active: data.is_active,
    },
  });
}
```

---

## 🧪 Testing

### Test Cases:

```http
### 1. Mode 1: No Approval
POST http://localhost:4000/api/v1/documents
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "file_name": "test.pdf",
  "file_base64": "...",
  "document_type_id": 1  // Tài liệu tham khảo (require_approval = false)
}

# Expected: status = "active"


### 2. Mode 2: Strict Workflow
POST http://localhost:4000/api/v1/documents
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "file_name": "contract.pdf",
  "file_base64": "...",
  "document_type_id": 3  // Hợp đồng (require_approval = true, allow_override = false)
}

# Expected: status = "pending_approval", auto-submitted


### 3. Mode 3: Flexible Workflow (Use Default)
POST http://localhost:4000/api/v1/documents
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "file_name": "memo.pdf",
  "file_base64": "...",
  "document_type_id": 2  // Công văn (require_approval = true, allow_override = true)
}

# Expected: status = "pending_approval", use default workflow


### 4. Mode 3: Flexible Workflow (Customized)
POST http://localhost:4000/api/v1/documents
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "file_name": "memo.pdf",
  "file_base64": "...",
  "document_type_id": 2,
  "customized_steps": [
    {
      "approver_type": "user",
      "approver_id": 2,
      "due_in_days": 3
    },
    {
      "approver_type": "user",
      "approver_id": 3,
      "due_in_days": 5
    }
  ]
}

# Expected: status = "pending_approval", customized workflow created


### 5. Mode 4: Ad-hoc Workflow
POST http://localhost:4000/api/v1/documents
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "file_name": "proposal.pdf",
  "file_base64": "...",
  "document_type_id": 7,  // Đề xuất (require_approval = true, default_workflow_id = null)
  "adhoc_steps": [
    {
      "approver_user_id": 2,
      "due_in_days": 3
    },
    {
      "approver_user_id": 3,
      "due_in_days": 5
    },
    {
      "approver_user_id": 4,
      "due_in_days": 7
    }
  ]
}

# Expected: status = "pending_approval", ad-hoc workflow created
```

---

## ✅ Checklist

- [ ] Update `documents.service.ts`
  - [ ] Add `createAdhocWorkflow()`
  - [ ] Add `createCustomizedWorkflow()`
  - [ ] Update `createDocument()` with 4-mode logic
- [ ] Update `documents.controller.ts`
  - [ ] Add validation for adhoc_steps
  - [ ] Add validation for customized_steps
- [ ] Update `documentTypes.service.ts`
  - [ ] Add validation for workflow fields
  - [ ] Update create/update methods
- [ ] Test all 4 modes
- [ ] Update API documentation

---

## 🔜 Next: Phase 3 - Frontend

After backend is complete, implement frontend:
1. Document Types page (add 3 checkboxes)
2. Documents Upload page (4 different UIs based on mode)

---

**Estimated Time**: 2.5 hours  
**Complexity**: Medium-High  
**Priority**: High
