# Complete Approval & Signer Implementation

## Tổng quan

Đã hoàn thành implementation đầy đủ cho việc phân biệt **Người phê duyệt** (Approver) và **Người ký** (Signer) trong workflow system.

## Vấn đề ban đầu

❌ **Trước đây:**
- Tất cả workflow steps đều được coi là "approver"
- Không có cách nào để chỉ định ai là người ký
- Signers phải được thêm thủ công sau khi tạo document
- Không thể assign fields trước khi approval vì chưa có signers

## Giải pháp

✅ **Bây giờ:**
- UI cho phép chọn rõ ràng: "Người phê duyệt" hoặc "Người ký"
- Backend đọc `participant_role` và xử lý đúng
- Signers được tạo tự động từ workflow
- Fields có thể được assign ngay từ đầu

## Changes

### 1. Database Schema

**Table: `workflow_steps`**
```sql
ALTER TABLE workflow_steps 
ADD COLUMN participant_role VARCHAR(20) DEFAULT 'approver';

-- Values: 'approver' | 'signer'
```

**Table: `signers`**
```sql
-- Status values include:
-- 'waiting_approval' - Waiting for approvals to complete
-- 'pending' - Ready to sign
-- 'otp_sent' - OTP sent (external)
-- 'signed' - Completed
```

### 2. Frontend Changes

#### A. WorkflowCustomizer.tsx

**Added:**
- Dropdown để chọn "👤 Người phê duyệt" hoặc "✍️ Người ký"
- Badge hiển thị role với màu khác nhau
- Include `participant_role` trong data gửi lên backend

```typescript
// Default value when adding new step
{
  step_name: 'Bước 1',
  approver_type: 'user',
  approver_id: userId,
  participant_role: 'approver', // ✅ NEW
  due_in_days: 3
}
```

#### B. Workflows Page

**Already had:**
- Field `participant_role` trong form
- Dropdown để chọn vai trò
- Badge hiển thị phân biệt approver vs signer

### 3. Backend Changes

#### A. documents.service.ts

**Line ~290: Create Approvals**
```typescript
// ✅ ONLY create approvals for approver steps
for (const step of workflow.steps) {
  // Skip signer steps
  if (step.participant_role === 'signer') {
    console.log(`Skipping signer step: ${step.step_name}`);
    continue;
  }
  
  // Create approval...
}
```

**Line ~350: Create Signers**
```typescript
// ✅ ONLY create signers for signer steps
const signerSteps = workflow.steps.filter(s => s.participant_role === 'signer');

for (const step of signerSteps) {
  // Create signer with status 'waiting_approval'
  await prisma.signers.create({
    data: {
      sign_request_id: signRequest.id,
      user_id: userId,
      email: user.email,
      name: user.full_name,
      role: 'signer',
      signing_order: step.step_order,
      status: hasApprovals ? 'waiting_approval' : 'pending',
      is_internal: true
    }
  });
}
```

#### B. approvals.service.ts

**Method: `approve()` - Line ~320**
```typescript
if (!nextStep) {
  // No more approver steps
  
  // ✅ Check for signers waiting for approval
  const waitingSigners = await prisma.signers.findMany({
    where: {
      sign_request_id: document.sign_request_id,
      status: 'waiting_approval'
    }
  });

  if (waitingSigners.length > 0) {
    // ✅ Activate signers
    for (const signer of waitingSigners) {
      await signersRepository.update(signer.id, {
        status: 'pending'
      });
    }
    
    // Send sign request
    await signRequestsService.sendSignRequest(...);
    
    // Update document status
    await prisma.documents.update({
      where: { id: document.id },
      data: { status: 'pending_signature' }
    });
  }
}
```

**Method: `submitForApproval()` - Line ~120**
```typescript
// ✅ Filter only approver steps
const approverSteps = workflow.steps.filter(
  step => step.participant_role === 'approver' || !step.participant_role
);

if (approverSteps.length === 0) {
  throw ApiError.badRequest('Workflow has no approver steps');
}
```

#### C. workflows.service.ts

**Methods: `createWorkflowStep()`, `updateWorkflowStep()`**
- Accept `participant_role` parameter
- Validate values: 'approver' | 'signer'
- Save to database

## Complete Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User tạo Workflow                                        │
│    ├─ Step 1: Phê duyệt - Trưởng phòng (approver)         │
│    ├─ Step 2: Ký - Giám đốc (signer)                       │
│    └─ Step 3: Phê duyệt cuối - CEO (approver)             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. User tạo Document với Workflow                          │
│    Backend tự động:                                         │
│    ├─ Tạo 2 Approvals (cho step 1, 3)                     │
│    ├─ Tạo 1 Signer (cho step 2) với status='waiting'      │
│    └─ Document status = 'pending_approval'                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. User vào Editor                                          │
│    ├─ Signer đã có sẵn                                     │
│    └─ Assign fields cho signer                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Approval Process                                         │
│    ├─ Step 1: Trưởng phòng approve                        │
│    └─ Step 3: CEO approve                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. All Approvals Complete                                   │
│    Backend tự động:                                         │
│    ├─ Activate signer (status: waiting → pending)          │
│    ├─ Generate signing token                               │
│    ├─ Send email với signing link                          │
│    └─ Document status = 'pending_signature'                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Signing Process                                          │
│    ├─ Step 2: Giám đốc ký document                        │
│    └─ Document status = 'completed'                        │
└─────────────────────────────────────────────────────────────┘
```

## Testing

### Test Scripts

1. **test-ui-workflow-creation.js** - Test workflow creation from UI
   ```bash
   node backend/scripts/test-ui-workflow-creation.js
   ```
   ✅ Result: 3 steps → 2 approvals + 1 signer (no duplicates)

2. **test-complete-workflow-flow.js** - Test complete flow
   ```bash
   node backend/scripts/test-complete-workflow-flow.js
   ```
   ✅ Result: Signers activated after approval

3. **test-approval-signer-creation.js** - Test bug detection
   ```bash
   node backend/scripts/test-approval-signer-creation.js
   ```
   ✅ Result: No signer steps in approvals

### Manual Testing

1. **Tạo workflow mới:**
   - Vào `/workflows`
   - Tạo workflow với 2-3 steps
   - Chọn rõ ràng "Người phê duyệt" hoặc "Người ký" cho mỗi step

2. **Tạo document:**
   - Chọn document type có workflow vừa tạo
   - Upload file
   - Submit

3. **Kiểm tra:**
   - Vào database check `document_approvals` - chỉ có approver steps
   - Check `signers` - chỉ có signer steps
   - Status của signers = 'waiting_approval'

4. **Approve document:**
   - Approve tất cả steps
   - Check signers status → should change to 'pending'
   - Check document status → should be 'pending_signature'

## Benefits

✅ **Rõ ràng hơn:**
- User biết chính xác ai là người phê duyệt, ai là người ký
- UI hiển thị badge màu khác nhau

✅ **Tự động hóa:**
- Signers được tạo tự động từ workflow
- Không cần thêm signers thủ công

✅ **Đúng flow:**
- Fields có thể assign trước khi approval
- Signers được activate đúng lúc

✅ **Không duplicate:**
- Mỗi người chỉ xuất hiện 1 lần
- Approvers không bị tạo thành signers và ngược lại

## Migration

### For existing workflows:

Workflows cũ không có `participant_role` sẽ:
- Được coi là approver-only workflows
- Signers phải được thêm thủ công
- Vẫn hoạt động bình thường

### To enable auto-signer creation:

Update existing workflows:
```sql
-- Mark signer steps
UPDATE workflow_steps 
SET participant_role = 'signer' 
WHERE step_name LIKE '%ký%' OR step_name LIKE '%sign%';

-- Mark approver steps
UPDATE workflow_steps 
SET participant_role = 'approver' 
WHERE participant_role IS NULL;
```

## Related Files

**Frontend:**
- `frontend/components/workflow/WorkflowCustomizer.tsx`
- `frontend/app/(dashboard)/workflows/page.tsx`

**Backend:**
- `backend/src/modules/documents/documents.service.ts`
- `backend/src/modules/approvals/approvals.service.ts`
- `backend/src/modules/workflows/workflows.service.ts`
- `backend/src/modules/signRequests/signRequests.service.ts`

**Tests:**
- `backend/scripts/test-ui-workflow-creation.js`
- `backend/scripts/test-complete-workflow-flow.js`
- `backend/scripts/test-approval-signer-creation.js`

**Documentation:**
- `docs/dev/FIX-APPROVAL-SIGNER-FLOW-COMPLETE.md`
- `docs/dev/BUG-WORKFLOW-PARTICIPANT-ROLE-DUPLICATE.md`

## Status

✅ **COMPLETE & TESTED**

Date: 2025-11-28
Author: Kiro AI Assistant
