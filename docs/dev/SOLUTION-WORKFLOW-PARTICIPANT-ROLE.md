# Solution: Workflow Participant Role

**Date:** 2025-11-27  
**Status:** ✅ RESOLVED  

## Vấn Đề

Khi tạo document và bấm "Tiếp tục" vào editor, không có người ký nào để thêm fields.

## Nguyên Nhân

1. **Workflow cũ không có `participant_role`**
   - Field `participant_role` đã có trong schema
   - Nhưng data trong database = NULL cho tất cả workflow steps cũ

2. **Code filter theo `participant_role = 'signer'`**
   - Backend: `workflow.steps.filter(s => s.participant_role === 'signer')`
   - Frontend: `workflowDetails.steps.filter(step => step.participant_role === 'signer')`
   - Kết quả: Mảng rỗng → Không có signers

3. **Tất cả workflows hiện tại CHỈ có approver steps**
   - Không có workflow nào có signer steps
   - Vì vậy không thể tự động tạo signers từ workflow

## Giải Pháp Đã Thực Hiện

### 1. Update Workflow Steps Cũ

Chạy script để set `participant_role = 'approver'` cho tất cả steps cũ:

```bash
node backend/scripts/update-workflow-participant-roles.js
```

Kết quả: 17 steps được update thành 'approver'

### 2. Tạo Workflow Mẫu Có Cả Approver và Signer

Chạy script để tạo workflow mới:

```bash
node backend/scripts/create-workflow-with-signers.js
```

Workflow mới:
- **Workflow ID: 9** - "Phê duyệt và ký hợp đồng"
- Step 1: Phê duyệt trưởng phòng (approver)
- Step 2: Phê duyệt giám đốc (approver)
- Step 3: Ký bởi trưởng phòng (signer)
- Step 4: Ký bởi giám đốc (signer)

## Cách Sử Dụng

### Option 1: Sử Dụng Workflow Có Signer Steps

1. Assign workflow ID 9 cho document type
2. Tạo document với document type đó
3. Workflow sẽ tự động tạo:
   - Approvals cho steps 1-2
   - Signers cho steps 3-4 (với status = 'waiting_approval')
4. Sau khi approvals xong, signers sẽ được activate

### Option 2: Thêm Signers Thủ Công

Nếu workflow chỉ có approver steps:

1. Tạo document
2. Vào editor page
3. Bấm "Quản lý người ký"
4. Thêm signers thủ công
5. Thêm fields cho signers
6. Gửi

### Option 3: Customize Workflow Khi Tạo Document

1. Chọn "Flexible" mode
2. Customize workflow steps
3. Thêm steps với `participant_role = 'signer'`
4. Frontend sẽ extract signers từ customized workflow

## Flow Đúng

```
CREATE DOCUMENT:
  ↓
Load/Create Workflow
  ↓
Extract Steps:
  - participant_role = 'approver' → Create Approvals
  - participant_role = 'signer' → Create Signers (status = 'waiting_approval')
  ↓
APPROVAL PROCESS:
  ↓
All Approvals Complete
  ↓
Activate Signers:
  - Update status: 'waiting_approval' → 'pending'
  - Send emails
  ↓
SIGNING PROCESS
```

## Database Schema

```sql
-- workflow_steps table
CREATE TABLE workflow_steps (
  id SERIAL PRIMARY KEY,
  workflow_id INT NOT NULL,
  step_order INT NOT NULL,
  step_name VARCHAR(255) NOT NULL,
  approver_type VARCHAR(50) NOT NULL,
  approver_id INT,
  participant_role VARCHAR(50), -- 'approver' | 'signer'
  due_in_days INT DEFAULT 3,
  ...
);
```

## Scripts Created

1. **`update-workflow-participant-roles.js`**
   - Updates old workflows to set participant_role
   - Auto-detects based on step name (contains "ký" or "sign")
   - Default to 'approver' if not detected

2. **`create-workflow-with-signers.js`**
   - Creates sample workflow with both approvers and signers
   - Can be used as template

## Testing

### Test Case 1: Workflow Với Signer Steps

```bash
# 1. Create document with workflow ID 9
# 2. Check signers are created
node backend/scripts/check-latest-document.js
```

Expected:
- Workflow instance created
- 2 approvals created (steps 1-2)
- 2 signers created (steps 3-4) with status = 'waiting_approval'

### Test Case 2: Workflow Chỉ Có Approver Steps

```bash
# 1. Create document with workflow ID 1-3
# 2. Check no signers created
node backend/scripts/check-latest-document.js
```

Expected:
- Workflow instance created
- Approvals created
- NO signers created
- User must add signers manually in editor

## Recommendations

### For Existing Workflows

Update workflows để thêm signer steps:

```sql
-- Add signer step to existing workflow
INSERT INTO workflow_steps (
  workflow_id, 
  step_order, 
  step_name, 
  approver_type, 
  approver_id, 
  participant_role,
  due_in_days
) VALUES (
  3, -- Workflow ID
  3, -- After approval steps
  'Ký bởi giám đốc',
  'user',
  2, -- User ID
  'signer',
  2
);
```

### For New Workflows

Khi tạo workflow mới, luôn specify `participant_role`:
- Approval steps: `participant_role = 'approver'`
- Signing steps: `participant_role = 'signer'`

### UI Improvement

Trong workflow management UI, thêm dropdown để chọn participant_role khi tạo/edit workflow steps.

## Related Files

- `backend/src/modules/documents/documents.service.ts` - Tạo signers từ workflow
- `frontend/components/documents/InternalSignersSelector.tsx` - Extract signers từ workflow
- `frontend/app/(dashboard)/sign-requests/create/page.tsx` - Upload document flow
- `frontend/app/(dashboard)/sign-requests/[id]/editor/page.tsx` - Editor page

## Summary

✅ **Vấn đề đã được giải quyết:**
- Workflow steps cũ đã được update với `participant_role`
- Tạo workflow mẫu có cả approver và signer steps
- Code đã đúng, chỉ cần data đúng

✅ **User có 3 options:**
1. Sử dụng workflow có signer steps (tự động)
2. Thêm signers thủ công trong editor
3. Customize workflow khi tạo document

✅ **Next steps:**
- Update existing workflows để thêm signer steps
- Hoặc tạo workflows mới với đầy đủ approver + signer steps
- Update UI để dễ dàng quản lý participant_role
