# Session 2025-11-27: Workflow Order Refactor - COMPLETED

**Date:** 2025-11-27  
**Status:** ✅ COMPLETED  
**Priority:** Critical

## Problem Identified

Khi tạo document với customized workflow, thứ tự logic SAI dẫn đến:
1. **Customized workflow approvals không được tạo** - Workflow được load TRƯỚC khi customized workflow được tạo
2. **Signers nhận email ngay lập tức** - Không đợi approvals hoàn thành

### Root Cause

```
OLD FLOW (BROKEN):
1. Tạo document
2. Tạo sign request
3. Load workflow (từ workflowId hoặc default_workflow_id)
   ❌ Customized workflow chưa tồn tại!
4. Tạo approvals từ workflow đã load
5. Tạo signers từ workflow đã load (status = 'pending')
6. SAU ĐÓ mới tạo customized workflow
   ❌ Quá muộn! Approvals và signers đã được tạo từ workflow cũ
```

## Solution Implemented

### New Flow (CORRECT)

```
NEW FLOW (FIXED):
1. Tạo document
2. Tạo sign request (draft)
3. ✅ XỬ LÝ WORKFLOW TRƯỚC:
   Priority 1: Nếu có customizedSteps → Tạo customized workflow NGAY
   Priority 2: Nếu có workflowId → Load workflow đó
   Priority 3: Nếu không → Load default workflow
4. ✅ Tạo APPROVALS từ workflow (nếu require_approval)
5. ✅ Tạo SIGNERS với status phụ thuộc vào approvals:
   - Nếu có approvals → status = 'waiting_approval'
   - Nếu không → status = 'pending'
6. ✅ Khi approval cuối cùng complete:
   - Update signers: 'waiting_approval' → 'pending'
   - Gửi email cho signers
```

## Files Modified

### 1. `backend/src/modules/documents/documents.service.ts`

**Changes in `createDocument()` method:**

#### Before:
```typescript
// Load workflow
const workflowId = input.workflowId || documentType.default_workflow_id;
const workflow = await prisma.workflows.findUnique({ where: { id: workflowId } });

// Create signers (status = 'pending')
for (const step of workflow.steps) {
  await signersRepository.create({ status: 'pending', ... });
}

// Create approvals
if (documentType.require_approval) {
  for (const step of workflow.steps) {
    await prisma.document_approvals.create({ ... });
  }
}

// THEN create customized workflow (too late!)
if (input.customizedSteps) {
  const customWorkflow = await this.createCustomizedWorkflow(...);
}
```

#### After:
```typescript
// ✅ STEP 1: DETERMINE WORKFLOW FIRST
let workflow = null;
let hasApprovals = false;

// Priority 1: Customized workflow (create immediately)
if (input.customizedSteps && input.customizedSteps.length > 0) {
  workflow = await this.createCustomizedWorkflow(
    input.workflowId || documentType.default_workflow_id,
    input.customizedSteps,
    document.id,
    tenantId,
    ownerId
  );
}
// Priority 2: Specific workflow ID
else if (input.workflowId) {
  workflow = await prisma.workflows.findUnique({ where: { id: input.workflowId } });
}
// Priority 3: Default workflow
else if (documentType.default_workflow_id) {
  workflow = await prisma.workflows.findUnique({ where: { id: documentType.default_workflow_id } });
}

// ✅ STEP 2: CREATE APPROVALS (if required)
if (documentType?.require_approval && workflow?.steps) {
  // Create workflow instance
  const instance = await prisma.workflow_instances.create({ ... });
  
  // Create approvals for ALL steps
  for (const step of workflow.steps) {
    await prisma.document_approvals.create({ ... });
  }
  
  hasApprovals = true;
  await documentsRepository.update(document.id, { status: 'pending_approval' });
}

// ✅ STEP 3: CREATE SIGNERS (with appropriate status)
const signerStatus = hasApprovals ? 'waiting_approval' : 'pending';

if (workflow?.steps) {
  for (const step of workflow.steps.filter(s => s.participant_role === 'signer')) {
    await signersRepository.create({
      status: signerStatus, // ✅ Depends on approvals
      ...
    });
  }
}

// Manual signers also use same status
if (input.signers) {
  for (const signer of input.signers) {
    await signersRepository.create({
      status: signerStatus, // ✅ Depends on approvals
      ...
    });
  }
}
```

### 2. `backend/src/modules/approvals/approvals.service.ts`

**Changes in `autoSendSignRequest()` method:**

#### Before:
```typescript
private async autoSendSignRequest(document: any, tenantId: number) {
  // Directly send sign request (emails sent immediately)
  await signRequestsService.sendSignRequest(
    document.sign_request_id,
    tenantId,
    0
  );
}
```

#### After:
```typescript
private async autoSendSignRequest(document: any, tenantId: number) {
  // ✅ STEP 1: Activate signers first
  const signers = await signersRepository.findBySignRequest(document.sign_request_id);
  const waitingSigners = signers.filter(s => s.status === 'waiting_approval');
  
  for (const signer of waitingSigners) {
    await signersRepository.update(signer.id, {
      status: 'pending' // ✅ Activate signer
    });
  }
  
  // ✅ STEP 2: Then send sign request (emails sent now)
  await signRequestsService.sendSignRequest(
    document.sign_request_id,
    tenantId,
    document.owner_id || 0
  );
}
```

## New Signer Status Flow

### Status Values:
- `waiting_approval` - Signer is created but waiting for approvals to complete
- `pending` - Signer is active and ready to sign (email sent)
- `otp_sent` - OTP has been sent to external signer
- `signed` - Signer has completed signing
- `rejected` - Signer rejected the document

### Status Transitions:

```
CREATE DOCUMENT WITH WORKFLOW:
  ↓
Has approvals? 
  YES → Create signers with status = 'waiting_approval'
  NO  → Create signers with status = 'pending' (send email immediately)
  ↓
APPROVAL PROCESS:
  ↓
All approvals complete?
  ↓
autoSendSignRequest() called:
  1. Update signers: 'waiting_approval' → 'pending'
  2. Send emails to all signers
  ↓
SIGNING PROCESS:
  ↓
External signer: 'pending' → 'otp_sent' → 'signed'
Internal signer: 'pending' → 'signed'
```

## Benefits

### 1. Correct Workflow Processing
- ✅ Customized workflows are created BEFORE approvals/signers
- ✅ Approvals are created from the correct workflow
- ✅ Signers are created from the correct workflow

### 2. Proper Email Timing
- ✅ Signers don't receive emails until approvals complete
- ✅ Business logic enforced: approve first, then sign
- ✅ No premature notifications

### 3. Clear Status Management
- ✅ `waiting_approval` status clearly indicates signers are blocked
- ✅ `pending` status means signer can proceed
- ✅ Status transitions are explicit and logged

## Testing Scenarios

### Scenario 1: Document with Customized Workflow + Approvals
```
Input:
- documentTypeId: 1 (requires approval, requires signing)
- customizedSteps: [
    { approver_type: 'user', approver_id: 2, participant_role: 'approver' },
    { approver_type: 'user', approver_id: 3, participant_role: 'signer' }
  ]

Expected:
1. ✅ Customized workflow created immediately
2. ✅ Approval created for step 1 (user 2)
3. ✅ Signer created for step 2 (user 3) with status = 'waiting_approval'
4. ✅ No email sent to signer yet
5. ✅ When user 2 approves → signer status → 'pending' + email sent
```

### Scenario 2: Document with Default Workflow + Approvals
```
Input:
- documentTypeId: 1 (has default_workflow_id)
- No customizedSteps

Expected:
1. ✅ Default workflow loaded
2. ✅ Approvals created for all approval steps
3. ✅ Signers created with status = 'waiting_approval'
4. ✅ When all approvals complete → signers activated + emails sent
```

### Scenario 3: Document without Approvals
```
Input:
- documentTypeId: 2 (no approval required, but requires signing)
- signers: [{ email: 'user@example.com', name: 'User' }]

Expected:
1. ✅ No workflow processing
2. ✅ Signers created with status = 'pending'
3. ✅ Emails sent immediately
```

### Scenario 4: Document with Workflow but No Signing
```
Input:
- documentTypeId: 3 (requires approval, no signing)
- customizedSteps: [{ approver_type: 'user', approver_id: 2 }]

Expected:
1. ✅ Customized workflow created
2. ✅ Approvals created
3. ✅ No signers created
4. ✅ When approved → document status = 'completed'
```

## Logging Added

All operations now have detailed console logging:

```typescript
console.log(`[Workflow] Creating customized workflow with ${steps.length} steps`);
console.log(`[Workflow] Customized workflow created: ID ${workflow.id}`);
console.log(`[Workflow Instance] Creating workflow instance for document ${document.id}`);
console.log(`[Workflow Step ${step.step_order}] Created approval for user ${approverUserId}`);
console.log(`[Signers] Signer status will be: ${signerStatus} (hasApprovals: ${hasApprovals})`);
console.log(`[Auto-Send] Activating signers for sign request ${signRequestId}`);
console.log(`[Auto-Send] Found ${waitingSigners.length} signers waiting for approval`);
console.log(`[Auto-Send] Activated signer: ${signer.email}`);
```

## Database Schema

No migration needed - `status` field in `signers` table is already `String?` type, supporting any status value.

## Related Issues Fixed

This refactor also fixes:
- ✅ Issue #1: Customized workflow approvals not created
- ✅ Issue #2: Premature email sending to signers
- ✅ Issue #3: Workflow processing order confusion
- ✅ Issue #4: Status management unclear

## Previous Session References

- **Session 2025-11-22:** Workflow integration completed (but had order issue)
- **Issue Document:** `docs/dev/ISSUE-CUSTOMIZED-WORKFLOW-ORDER.md`

## Next Steps

1. ✅ Test all 4 scenarios above
2. ✅ Verify email timing is correct
3. ✅ Check logs for proper workflow processing
4. ✅ Test with real users in development environment

---

**Summary:** Refactored workflow/approval/signer creation order to ensure customized workflows are created FIRST, then approvals, then signers with appropriate status. Signers now wait for approvals before receiving emails, enforcing proper business logic.
