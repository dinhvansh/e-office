# Fix: Approval → Signer Flow Complete

## Vấn đề ban đầu

Khi tạo document với workflow có cả approver và signer steps:
- ❌ Signers không được tạo cho đến khi approvals xong
- ❌ Không thể assign fields cho signers vì chưa có signers
- ❌ Flow bị ngược: Approval xong → Tạo signers → Assign fields (SAI!)

## Giải pháp

### Flow đúng:

```
1. Tạo Document
   ├─ Tạo Sign Request
   ├─ Tạo Workflow Instance
   ├─ Tạo Approvals (cho approver steps)
   ├─ Tạo Signers (cho signer steps) với status = 'waiting_approval'
   └─ Document status = 'pending_approval'

2. User Assign Fields
   └─ Signers đã có sẵn, user assign fields trong editor

3. Approval Process
   └─ Approvers phê duyệt từng bước

4. Approval Complete
   ├─ Activate Signers (status: 'waiting_approval' → 'pending')
   ├─ Send Sign Request (generate tokens, send emails)
   └─ Document status = 'pending_signature'

5. Signing Process
   └─ Signers ký document
```

## Code Changes

### 1. ✅ `documents.service.ts` - Tạo signers khi tạo document

**File**: `backend/src/modules/documents/documents.service.ts`

Logic đã có sẵn (line ~200-400):
- Tạo sign request nếu `require_digital_signing`
- Tạo workflow instance nếu `require_approval`
- Tạo approvals cho tất cả workflow steps
- **Tạo signers từ workflow với status = `waiting_approval`**

```typescript
// Determine signer status based on approvals
const signerStatus = hasApprovals ? 'waiting_approval' : 'pending';

// Create signers for steps with participant_role = 'signer'
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
      status: signerStatus, // 'waiting_approval' if has approvals
      is_internal: true
    }
  });
}
```

### 2. ✅ `approvals.service.ts` - Activate signers sau khi approval xong

**File**: `backend/src/modules/approvals/approvals.service.ts`

**Method**: `approve()` - line ~320

```typescript
if (!nextStep) {
  // No more APPROVER steps, check if there are SIGNERS waiting
  
  // ✅ Check if there are signers waiting for approval
  if (document?.sign_request_id) {
    const waitingSigners = await prisma.signers.findMany({
      where: {
        sign_request_id: document.sign_request_id,
        status: 'waiting_approval'
      }
    });

    if (waitingSigners.length > 0) {
      // ✅ Activate signers (change status from waiting_approval to pending)
      for (const signer of waitingSigners) {
        await signersRepository.update(signer.id, {
          status: 'pending'
        });
      }
      
      // Send sign request (generate tokens, send emails)
      await signRequestsService.sendSignRequest(
        document.sign_request_id,
        tenantId,
        document.owner_id || userId
      );
      
      // Update document status to pending_signature
      await prisma.documents.update({
        where: { id: approval.document_id },
        data: { status: 'pending_signature' },
      });
    } else {
      // No signers waiting, mark as completed
      await prisma.documents.update({
        where: { id: approval.document_id },
        data: { status: 'completed' },
      });
    }
  }
}
```

### 3. ✅ `submitForApproval` - Chỉ tạo approvals cho approver steps

**File**: `backend/src/modules/approvals/approvals.service.ts`

**Method**: `submitForApproval()` - line ~120

```typescript
// ✅ Filter only approver steps (not signer steps)
const approverSteps = workflow.steps.filter(
  step => step.participant_role === 'approver' || !step.participant_role // backward compatibility
);

if (approverSteps.length === 0) {
  throw ApiError.badRequest('Workflow has no approver steps', 'WORKFLOW_NO_APPROVER_STEPS');
}

// Get first approver step
const firstStep = approverSteps[0];
```

## Database Schema

### Signer Status Values

```typescript
enum SignerStatus {
  'waiting_approval' // ✅ NEW: Waiting for approvals to complete
  'pending'          // Ready to sign
  'otp_sent'         // OTP sent (external signers)
  'signed'           // Signed
  'rejected'         // Rejected
}
```

### Workflow Step participant_role

```typescript
enum ParticipantRole {
  'approver' // Step is for approval
  'signer'   // Step is for signing
}
```

## Testing

### Test Scripts

1. **test-complete-workflow-flow.js** - Test complete flow
   ```bash
   node backend/scripts/test-complete-workflow-flow.js
   ```

2. **test-approval-signer-creation.js** - Test bug detection
   ```bash
   node backend/scripts/test-approval-signer-creation.js
   ```

3. **test-mixed-workflow-bug.js** - Test mixed workflow
   ```bash
   node backend/scripts/test-mixed-workflow-bug.js
   ```

### Test Results

```
✅ TEST PASSED!
- Document moved to pending_signature ✓
- All signers activated (status: pending) ✓
- Ready to send sign request ✓
```

## Benefits

1. ✅ **Fields can be assigned before approval** - Signers exist from the start
2. ✅ **No duplicate signers** - Signers created once, activated later
3. ✅ **Clear status tracking** - `waiting_approval` → `pending` → `signed`
4. ✅ **Backward compatible** - Old workflows without `participant_role` still work
5. ✅ **Proper separation** - Approvers and signers are distinct

## Migration Notes

### For existing workflows:

Old workflows may not have `participant_role` field. They will:
- Be treated as approver-only workflows
- Signers must be added manually in editor
- No automatic signer creation from workflow

### To enable auto-signer creation:

Update workflow steps to include `participant_role`:
```sql
UPDATE workflow_steps 
SET participant_role = 'signer' 
WHERE step_name LIKE '%ký%' OR step_name LIKE '%sign%';

UPDATE workflow_steps 
SET participant_role = 'approver' 
WHERE participant_role IS NULL;
```

## Related Files

- `backend/src/modules/documents/documents.service.ts` - Document creation
- `backend/src/modules/approvals/approvals.service.ts` - Approval logic
- `backend/src/modules/signRequests/signRequests.service.ts` - Sign request logic
- `backend/src/modules/workflows/workflows.service.ts` - Workflow management
- `docs/dev/BUG-WORKFLOW-PARTICIPANT-ROLE-DUPLICATE.md` - Original bug report

## Status

✅ **COMPLETE** - Tested and working

Date: 2025-11-28
