# Feature: Sequential Approval

## Overview

Implemented sequential approval workflow where approvers only see documents when it's their turn to approve. This prevents confusion and ensures proper approval order.

## Problem

**Before:**
- All approvers saw documents immediately when submitted
- Approver 2 could see and approve before Approver 1
- No control over approval sequence
- Confusing for users who weren't sure if they should wait

## Solution

**After:**
- Only current step approvers see the document
- Next step approvers have status 'waiting' (invisible to them)
- When current step completes, next step automatically activates
- Clear sequential flow with email notifications

## Implementation

### 1. New Approval Status: `waiting`

**Approval action values:**
- `waiting` - ⭐ NEW - Approval created but not yet visible (waiting for previous step)
- `pending` - Visible to approver, ready to act
- `approved` - Approved
- `rejected` - Rejected

### 2. Document Creation Logic

**File:** `backend/src/modules/documents/documents.service.ts`

When creating approvals for a document:
```typescript
// Filter approver steps only
const approverSteps = workflow.steps.filter(s => s.participant_role !== 'signer');

for (const step of approverSteps) {
  // ⭐ SEQUENTIAL: First approver step = 'pending', others = 'waiting'
  const isFirstStep = step.step_order === approverSteps[0].step_order;
  const approvalStatus = isFirstStep ? 'pending' : 'waiting';
  
  await prisma.document_approvals.create({
    data: {
      document_id: document.id,
      workflow_step_id: step.id,
      approver_user_id: approverId,
      action: approvalStatus, // ⭐ 'pending' or 'waiting'
      due_date: dueDate
    }
  });
}
```

### 3. Approval Logic

**File:** `backend/src/modules/approvals/approvals.service.ts`

When an approver approves:
```typescript
async approve(approvalId, userId, tenantId) {
  // 1. Mark current approval as approved
  await updateApproval(approvalId, { action: 'approved' });
  
  // 2. Check if all approvals in current step are done
  const stepApprovals = await findStepApprovals(documentId, stepId);
  const allStepApproved = stepApprovals.every(a => a.action === 'approved');
  
  if (!allStepApproved) {
    return { message: 'Waiting for other approvers in this step' };
  }
  
  // 3. Find next step
  const nextStep = getNextApproverStep(currentStep);
  
  if (nextStep) {
    // ⭐ Activate next step: 'waiting' → 'pending'
    await prisma.document_approvals.updateMany({
      where: {
        document_id: documentId,
        workflow_step_id: nextStep.id,
        action: 'waiting'
      },
      data: {
        action: 'pending'
      }
    });
    
    // Update workflow instance
    await updateWorkflowInstance(documentId, {
      current_step_id: nextStep.id
    });
    
    // Send email to next approvers
    await sendEmailToNextApprovers(nextStep);
    
    return {
      message: `Step approved! Moved to next step: ${nextStep.step_name}`,
      status: 'next_step'
    };
  }
  
  // 4. No more steps - workflow complete
  await completeWorkflow(documentId);
}
```

### 4. Query Logic

**File:** `backend/src/modules/approvals/approvals.repository.ts`

Only return 'pending' approvals:
```typescript
async findPendingApprovals(userId: number, tenantId: number) {
  // ⭐ SEQUENTIAL APPROVAL: Only return 'pending', not 'waiting'
  return prisma.document_approvals.findMany({
    where: {
      approver_user_id: userId,
      action: 'pending', // Only pending, not waiting
      document: {
        tenant_id: tenantId,
      },
    },
    // ...
  });
}
```

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Document Submitted                                          │
│ ├─ Step 1: action = 'pending'   ✓ Visible to Approver 1   │
│ ├─ Step 2: action = 'waiting'   ✗ Hidden from Approver 2  │
│ └─ Step 3: action = 'waiting'   ✗ Hidden from Approver 3  │
└─────────────────────────────────────────────────────────────┘
                            ↓
                   Approver 1 approves
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 1 Complete                                             │
│ ├─ Step 1: action = 'approved'  ✅ Done                    │
│ ├─ Step 2: action = 'pending'   ✓ NOW visible to Approver 2│
│ └─ Step 3: action = 'waiting'   ✗ Still hidden             │
│                                                             │
│ 📧 Email sent to Approver 2                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
                   Approver 2 approves
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2 Complete                                             │
│ ├─ Step 1: action = 'approved'  ✅ Done                    │
│ ├─ Step 2: action = 'approved'  ✅ Done                    │
│ └─ Step 3: action = 'pending'   ✓ NOW visible to Approver 3│
│                                                             │
│ 📧 Email sent to Approver 3                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
                   Approver 3 approves
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ All Steps Complete                                          │
│ ├─ Workflow status = 'completed'                           │
│ ├─ Document status = 'pending_signature' (if has signers)  │
│ └─ Document status = 'completed' (if no signers)           │
│                                                             │
│ 📧 Email sent to document owner                            │
└─────────────────────────────────────────────────────────────┘
```

## Benefits

✅ **Clear sequence** - Approvers know exactly when it's their turn

✅ **No confusion** - Approver 2 doesn't see document until Approver 1 is done

✅ **Automatic progression** - System automatically moves to next step

✅ **Email notifications** - Each approver gets notified when it's their turn

✅ **Audit trail** - Clear record of approval sequence

## Testing

### Automated Test

Run the test script:
```bash
node backend/scripts/test-sequential-approval.js
```

**Test coverage:**
1. ✅ Initial state: Step 1 = pending, Step 2 = waiting
2. ✅ Approver 2 cannot see document initially
3. ✅ After Approver 1 approves, Step 2 becomes pending
4. ✅ Approver 2 can now see document
5. ✅ Workflow progresses correctly

### Manual Testing

1. **Create workflow with 3 steps:**
   - Step 1: User A (approver)
   - Step 2: User B (approver)
   - Step 3: User C (approver)

2. **Create document with this workflow**

3. **Check database:**
   ```sql
   SELECT 
     da.id,
     ws.step_order,
     ws.step_name,
     u.email,
     da.action
   FROM document_approvals da
   JOIN workflow_steps ws ON da.workflow_step_id = ws.id
   JOIN users u ON da.approver_user_id = u.id
   WHERE da.document_id = <document_id>
   ORDER BY ws.step_order;
   ```
   
   Expected:
   ```
   step_order | email      | action
   -----------|------------|--------
   1          | userA@...  | pending
   2          | userB@...  | waiting
   3          | userC@...  | waiting
   ```

4. **Login as User B** - Should NOT see document in pending approvals

5. **Login as User A** - Should see document, approve it

6. **Check database again:**
   ```
   step_order | email      | action
   -----------|------------|--------
   1          | userA@...  | approved
   2          | userB@...  | pending   ← Changed!
   3          | userC@...  | waiting
   ```

7. **Login as User B** - Should NOW see document

8. **User B approves** - Step 3 should become pending

9. **User C approves** - Workflow completes

## Migration

### For existing documents

Existing documents with all approvals as 'pending' will continue to work normally. They will behave as parallel approval (all approvers see document immediately).

### To enable sequential for existing workflows

No migration needed. The sequential logic is applied automatically when new documents are created.

### Database

No schema changes required. We're using existing `action` field with new value 'waiting'.

## Related Files

**Backend:**
- `backend/src/modules/documents/documents.service.ts` - Create approvals with sequential logic
- `backend/src/modules/approvals/approvals.service.ts` - Activate next step on approve
- `backend/src/modules/approvals/approvals.repository.ts` - Query only 'pending' approvals

**Tests:**
- `backend/scripts/test-sequential-approval.js` - Automated test

**Documentation:**
- `docs/dev/FEATURE-SEQUENTIAL-APPROVAL.md` - This file

## Future Enhancements

### Parallel Approval Option

Could add a field to workflow_steps:
```typescript
is_parallel: boolean // true = all steps run at once, false = sequential
```

Then in logic:
```typescript
if (step.is_parallel) {
  // Create all approvals as 'pending'
} else {
  // Create first as 'pending', others as 'waiting'
}
```

### Skip Step

Allow approvers to skip to next step if needed:
```typescript
async skipStep(approvalId, userId, reason) {
  // Mark as 'skipped'
  // Activate next step
}
```

### Parallel Steps Within Sequential Flow

Allow some steps to run in parallel:
```
Step 1 (sequential) → Step 2a + 2b (parallel) → Step 3 (sequential)
```

## Status

✅ **IMPLEMENTED & TESTED**

Date: 2025-11-28
Author: Kiro AI Assistant

---

## Quick Reference

**Approval Status Values:**
- `waiting` - Not yet visible (waiting for previous step)
- `pending` - Visible and ready to act
- `approved` - Approved
- `rejected` - Rejected

**Key Behavior:**
- Only 'pending' approvals are visible to users
- 'waiting' approvals become 'pending' when previous step completes
- Email notifications sent when step becomes active
- Workflow progresses automatically
