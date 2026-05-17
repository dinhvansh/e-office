# BUG: Workflow Participant Role Duplicate

## Vấn đề

Khi tạo document với workflow có cả `approver` và `signer` steps:
- Tất cả steps đều được tạo thành **approvals** (bao gồm cả signer steps)
- Sau đó signer steps lại được tạo thành **signers**
- Kết quả: User xuất hiện 2 lần (1 lần trong approvals, 1 lần trong signers)

## Ví dụ

Workflow "test" có 3 steps:
1. admin@acme.local - `participant_role: 'signer'`
2. Van NGUYEN - `participant_role: 'approver'`
3. External user - `participant_role: 'approver'`

Kết quả trong DB:
- **Approvals**: 3 records (admin, Van, External) ❌ SAI
- **Signers**: 1 record (admin) ✅ ĐÚNG

Đáng ra phải:
- **Approvals**: 2 records (Van, External) ✅
- **Signers**: 1 record (admin) ✅

## Root Cause

### 1. `submitForApproval` (approvals.service.ts)

```typescript
// ❌ BUG: Lấy TẤT CẢ steps, không filter participant_role
const workflow = await prisma.workflows.findFirst({
  include: {
    steps: { orderBy: { step_order: 'asc' } }
  }
});

const firstStep = workflow.steps[0]; // Có thể là signer step!
```

### 2. `createInternalSignersFromWorkflow` (signRequests.service.ts)

```typescript
// ✅ ĐÚNG: Chỉ lấy signer steps
const workflowSteps = await prisma.workflow_steps.findMany({
  where: {
    workflow_id: workflowId,
    participant_role: 'signer' // ✅ Filter đúng
  }
});
```

**Vấn đề**: Method này KHÔNG được gọi ở đâu cả!

## Solution

### Fix 1: Filter approver steps trong `submitForApproval`

```typescript
// ✅ FIX: Chỉ lấy approver steps
const approverSteps = workflow.steps.filter(
  step => step.participant_role === 'approver' || !step.participant_role
);

if (approverSteps.length === 0) {
  throw ApiError.badRequest('Workflow has no approver steps');
}

const firstStep = approverSteps[0];
```

### Fix 2: Gọi `createInternalSignersFromWorkflow` sau khi approvals xong

Cần thêm logic:
1. Khi approval cuối cùng được approve
2. Check xem workflow có signer steps không
3. Nếu có → Tạo signers và send sign request
4. Nếu không → Complete document

```typescript
// Trong approvals.service.ts - approve method
if (allApproved) {
  // Check if workflow has signer steps
  const signerSteps = await prisma.workflow_steps.findMany({
    where: {
      workflow_id: approval.workflow_id,
      participant_role: 'signer'
    }
  });

  if (signerSteps.length > 0) {
    // Create signers from workflow
    await signRequestsService.createInternalSignersFromWorkflow(
      signRequestId,
      approval.workflow_id,
      tenantId
    );
    
    // Send sign request
    await signRequestsService.sendSignRequest(signRequestId, tenantId, userId);
  } else {
    // No signers needed, complete document
    await prisma.documents.update({
      where: { id: documentId },
      data: { status: 'completed' }
    });
  }
}
```

## Status

- [x] Fix 1: Filter approver steps - **DONE**
- [ ] Fix 2: Call createInternalSignersFromWorkflow after approvals
- [ ] Test với workflow có cả approver và signer
- [ ] Clean up existing duplicate data

## Testing

```bash
# Test workflow với mixed roles
node scripts/test-workflow-mixed-roles.js

# Check document flow
node scripts/check-document-full-flow.js 008/2025
```

## Related Files

- `backend/src/modules/approvals/approvals.service.ts`
- `backend/src/modules/signRequests/signRequests.service.ts`
- `backend/src/modules/workflows/workflows.service.ts`

## Notes

- Backward compatibility: Steps không có `participant_role` được coi là 'approver'
- External signers vẫn cần được handle riêng
- Cần update UI để hiển thị rõ approver vs signer trong workflow editor
