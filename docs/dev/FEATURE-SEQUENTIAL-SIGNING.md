# Feature: Sequential Signing

**Date:** November 28, 2025  
**Status:** ✅ IMPLEMENTED & TESTED

## Overview

Implemented sequential signing workflow where signers only see documents and receive emails when it's their turn to sign. This ensures proper signing order and prevents confusion.

## Problem Statement

**User Request:**
> "Tương tự đối với người ký, không cho xem và không gửi thông báo cho tới khi tới lượt ký"

**Translation:**
> "Same for signers - don't let them see and don't send notifications until it's their turn to sign"

**Before Implementation:**
- All signers received emails immediately
- All signers could see the document at once
- No control over signing sequence
- Signer 2 could sign before Signer 1

## Solution

### New Signer Status: `waiting_signing`

Added new status to `signers.status`:
- `waiting_signing` - ⭐ NEW - Signer created but not visible (waiting for previous signer)
- `pending` - Visible to signer, ready to sign
- `otp_sent` - OTP sent, can sign
- `signed` - Signed
- `waiting_approval` - Waiting for approvals to complete

### Implementation Details

#### 1. Document Creation (`documents.service.ts`)

When creating signers from workflow:
```typescript
for (let i = 0; i < signerSteps.length; i++) {
  const step = signerSteps[i];
  const isFirstSigner = i === 0;
  
  // ⭐ SEQUENTIAL SIGNING: First signer gets base status, others get 'waiting_signing'
  let signerStatus = baseSignerStatus; // 'waiting_approval' or 'pending'
  if (!isFirstSigner && baseSignerStatus === 'pending') {
    signerStatus = 'waiting_signing'; // Wait for previous signer
  }
  
  await signersRepository.create({
    status: signerStatus,
    signing_order: step.step_order,
    // ...
  });
}
```

#### 2. Send Sign Request (`signRequests.service.ts`)

Only send emails to pending signers:
```typescript
// ⭐ SEQUENTIAL SIGNING: Only send emails to signers with status 'pending'
const pendingSigners = signersWithTokens.filter(s => s.status === 'pending');
const waitingSigners = signersWithTokens.filter(s => s.status === 'waiting_signing');

console.log(`📧 Sending emails to ${pendingSigners.length} pending signers (${waitingSigners.length} waiting)...`);

for (const signer of pendingSigners) {
  // Send email with OTP only to pending signers
  await emailService.sendSignRequestWithOTP({
    recipientEmail: signer.email,
    // ...
  });
}
```

#### 3. After Signing (`publicSign.controller.ts`)

Activate next signer when current signer completes:
```typescript
// ⭐ SEQUENTIAL SIGNING: Activate next signer
const waitingSigners = allSigners.filter(s => s.status === 'waiting_signing');

if (waitingSigners.length > 0) {
  // Get first waiting signer
  const nextSigner = waitingSigners.sort((a, b) => 
    (a.signing_order || 0) - (b.signing_order || 0)
  )[0];
  
  // Activate: 'waiting_signing' → 'pending'
  await prisma.signers.update({
    where: { id: nextSigner.id },
    data: { status: 'pending' }
  });
  
  // Generate OTP and send email
  await emailService.sendSignRequestWithOTP({
    recipientEmail: nextSigner.email,
    message: `It's now your turn to sign. Previous signer has completed.`,
    // ...
  });
}
```

#### 4. After Approvals Complete (`approvals.service.ts`)

Only activate first signer:
```typescript
// ⭐ SEQUENTIAL SIGNING: Only activate first signer
const sortedSigners = waitingSigners.sort((a, b) => 
  (a.signing_order || 0) - (b.signing_order || 0)
);

// Activate first signer: 'waiting_approval' → 'pending'
await signersRepository.update(sortedSigners[0].id, {
  status: 'pending'
});

// Change remaining signers: 'waiting_approval' → 'waiting_signing'
for (let i = 1; i < sortedSigners.length; i++) {
  await signersRepository.update(sortedSigners[i].id, {
    status: 'waiting_signing'
  });
}
```

## Flow Diagram

```
Document Created with Signers
├─ Signer 1: status = 'pending'          ✓ Can sign, email sent
├─ Signer 2: status = 'waiting_signing'  ✗ Cannot sign, no email
└─ Signer 3: status = 'waiting_signing'  ✗ Cannot sign, no email
         ↓
   Signer 1 signs
         ↓
After Signer 1 Completes
├─ Signer 1: status = 'signed'           ✅ Done
├─ Signer 2: status = 'pending'          ✓ NOW can sign, email sent
└─ Signer 3: status = 'waiting_signing'  ✗ Still waiting
         ↓
   Signer 2 signs
         ↓
After Signer 2 Completes
├─ Signer 1: status = 'signed'           ✅ Done
├─ Signer 2: status = 'signed'           ✅ Done
└─ Signer 3: status = 'pending'          ✓ NOW can sign, email sent
         ↓
   Signer 3 signs
         ↓
All Signers Complete
├─ Sign request status = 'completed'
└─ Document status = 'completed'
```

## Combined Flow: Approvals + Sequential Signing

```
Document Submitted
├─ Approval 1: action = 'pending'
├─ Approval 2: action = 'waiting'
├─ Signer 1: status = 'waiting_approval'
└─ Signer 2: status = 'waiting_approval'
         ↓
   Approval 1 approves
         ↓
├─ Approval 1: action = 'approved'
├─ Approval 2: action = 'pending'  ← Activated
├─ Signer 1: status = 'waiting_approval'
└─ Signer 2: status = 'waiting_approval'
         ↓
   Approval 2 approves
         ↓
All Approvals Complete
├─ Signer 1: status = 'pending'          ← Activated, email sent
└─ Signer 2: status = 'waiting_signing'  ← Changed from waiting_approval
         ↓
   Signer 1 signs
         ↓
├─ Signer 1: status = 'signed'
└─ Signer 2: status = 'pending'          ← Activated, email sent
         ↓
   Signer 2 signs
         ↓
All Complete!
```

## Testing

### Test Script

**Script:** `backend/scripts/test-sequential-signing.js`

**Results:**
```
✅ TEST 1 PASSED: Signer 1 is pending, Signer 2 is waiting
✅ TEST 2 PASSED: Signer 1 signed successfully
✅ TEST 3 PASSED: Signer 1 signed, Signer 2 now pending
✅ TEST 4 PASSED: Signer 2 signed successfully
✅ TEST 5 PASSED: All completed
```

### Manual Testing

1. **Create document with 3 signers**
   - Signer 1: User A
   - Signer 2: User B
   - Signer 3: User C

2. **Check database:**
   ```sql
   SELECT 
     id,
     email,
     signing_order,
     status,
     signed_at
   FROM signers
   WHERE sign_request_id = <sign_request_id>
   ORDER BY signing_order;
   ```
   
   Expected:
   ```
   signing_order | email      | status
   --------------|------------|----------------
   1             | userA@...  | pending
   2             | userB@...  | waiting_signing
   3             | userC@...  | waiting_signing
   ```

3. **Check User B's email** - Should NOT receive email yet

4. **User A signs document**

5. **Check database again:**
   ```
   signing_order | email      | status
   --------------|------------|----------------
   1             | userA@...  | signed
   2             | userB@...  | pending         ← Changed!
   3             | userC@...  | waiting_signing
   ```

6. **Check User B's email** - Should NOW receive email

7. **User B signs** - User C should receive email

8. **User C signs** - Document completes

## Files Modified

### Backend

1. **backend/src/modules/documents/documents.service.ts**
   - Updated signer creation logic
   - First signer = 'pending', others = 'waiting_signing'

2. **backend/src/modules/signRequests/signRequests.service.ts**
   - Only send emails to 'pending' signers
   - Skip 'waiting_signing' signers

3. **backend/src/modules/public/publicSign.controller.ts**
   - Activate next signer after current completes
   - Send email to next signer

4. **backend/src/modules/approvals/approvals.service.ts**
   - Only activate first signer after approvals
   - Change others to 'waiting_signing'

### Tests

1. **backend/scripts/test-sequential-signing.js**
   - Complete sequential signing test
   - 5 test cases covering all scenarios

### Documentation

1. **docs/dev/FEATURE-SEQUENTIAL-SIGNING.md** - This file
2. **docs/dev/FEATURE-SEQUENTIAL-APPROVAL.md** - Related approval feature

## Benefits

✅ **Clear sequence** - Signers know exactly when it's their turn

✅ **No confusion** - Signer 2 doesn't see document until Signer 1 is done

✅ **No premature emails** - Emails sent only when it's signer's turn

✅ **Automatic progression** - System automatically moves to next signer

✅ **Works with approvals** - Integrates seamlessly with sequential approvals

✅ **No breaking changes** - Existing documents continue to work

## Database Impact

**No schema changes required!**

We're using the existing `status` field in `signers` table with a new value 'waiting_signing'.

**Existing values:**
- 'pending'
- 'otp_sent'
- 'signed'
- 'rejected'
- 'waiting_approval'

**New value:**
- 'waiting_signing' ⭐

## Migration

### For Existing Documents

Existing documents with all signers as 'pending' will continue to work normally. They behave as parallel signing (all signers can sign at once).

### For New Documents

Sequential logic is applied automatically when new documents are created.

### No Action Required

No database migration or data update needed.

## Signer Status Values

| Status | Meaning | Visible to Signer? | Can Sign? | Email Sent? |
|--------|---------|-------------------|-----------|-------------|
| `waiting_approval` | Waiting for approvals | ✗ No | ✗ No | ✗ No |
| `waiting_signing` | Waiting for previous signer | ✗ No | ✗ No | ✗ No |
| `pending` | Ready to sign | ✓ Yes | ✓ Yes | ✓ Yes |
| `otp_sent` | OTP sent, can sign | ✓ Yes | ✓ Yes | ✓ Yes |
| `signed` | Completed | ✓ Yes | ✗ No | - |
| `rejected` | Rejected | ✓ Yes | ✗ No | - |

## Related Features

- [FEATURE-SEQUENTIAL-APPROVAL.md](./FEATURE-SEQUENTIAL-APPROVAL.md) - Sequential approval for approvers
- [COMPLETE-APPROVAL-SIGNER-IMPLEMENTATION.md](./COMPLETE-APPROVAL-SIGNER-IMPLEMENTATION.md) - Approver vs Signer separation

## Future Enhancements

### 1. Parallel Signing Option

Add field to sign_requests:
```typescript
signing_mode: 'sequential' | 'parallel'
```

### 2. Skip Signer

Allow skipping a signer if needed:
```typescript
async skipSigner(signerId, reason) {
  // Mark as 'skipped'
  // Activate next signer
}
```

### 3. Reminder Emails

Send reminder to current signer if not signed within X days.

## Status

✅ **COMPLETE & TESTED**

- Implementation: ✅ Done
- Unit Tests: ✅ Passing
- Integration with Approvals: ✅ Working
- Documentation: ✅ Complete
- No Breaking Changes: ✅ Confirmed

---

**Implemented by:** Kiro AI Assistant  
**Date:** November 28, 2025  
**Related to:** Sequential Approval feature
