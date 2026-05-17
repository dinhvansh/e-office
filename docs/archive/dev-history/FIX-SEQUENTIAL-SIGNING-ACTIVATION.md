# Fix: Sequential Signing Activation

**Date**: 2025-11-29  
**Status**: ✅ Complete

## Problem

Trong sequential signing workflow, khi signer order 1 hoàn thành ký, signer order 2 vẫn ở trạng thái `waiting_signing` thay vì được tự động activate thành `pending`. Điều này khiến:

1. Signer order 2 không thấy task trong danh sách "Chờ ký"
2. Signer order 2 không nhận được thông báo
3. Workflow bị stuck, không thể tiếp tục

## Root Cause

### Issue 1: My Tasks Filter
File: `backend/src/modules/approvals/approvals.service.ts` - `getMyCombinedTasks()`

Code đang lấy TẤT CẢ signers có `user_id: userId` và `is_internal: true`, bao gồm cả `waiting_signing`:

```typescript
signers: {
  where: {
    user_id: userId,
    is_internal: true,
  }
}
```

**Vấn đề**: `waiting_signing` là trạng thái "chờ tới lượt", KHÔNG phải "chờ ký". Chỉ có `pending` và `otp_sent` mới là "chờ ký".

### Issue 2: Missing Auto-Activation
Khi signer hoàn thành ký, code không tự động activate signer tiếp theo trong sequential workflow.

## Solution

### Fix 1: Filter My Tasks Correctly

**File**: `backend/src/modules/approvals/approvals.service.ts`

```typescript
signers: {
  where: {
    user_id: userId,
    is_internal: true,
    status: {
      in: ['pending', 'otp_sent', 'signed', 'rejected'] // ✅ Exclude waiting_signing
    }
  }
}
```

**Logic**:
- `pending`, `otp_sent`: Đến lượt ký → Hiển thị trong "Chờ ký"
- `signed`, `rejected`: Đã xử lý → Hiển thị trong lịch sử
- `waiting_signing`: Chưa tới lượt → KHÔNG hiển thị
- `waiting_approval`: Chờ approval → KHÔNG hiển thị

### Fix 2: Auto-Activate Next Signer (Internal Signing)

**File**: `backend/src/modules/signRequests/signRequests.service.ts` - `signInternal()`

Thêm logic sau khi signer ký xong:

```typescript
// ✅ SEQUENTIAL WORKFLOW: Activate next signer
if (signRequest.workflow_type === 'sequential' && signer.signing_order) {
  const allSigners = await signersRepository.findBySignRequest(signRequestId);
  
  // Find next signer in order
  const nextSigner = allSigners.find(s => 
    s.signing_order === (signer.signing_order! + 1) &&
    s.status === 'waiting_signing'
  );

  if (nextSigner) {
    console.log(`[Sequential Signing] Activating next signer: ${nextSigner.name}`);
    
    // Update status: waiting_signing → pending
    await signersRepository.update(nextSigner.id, {
      status: 'pending'
    });

    // Send notification to next signer
    if (nextSigner.is_internal && nextSigner.user_id) {
      await notificationsService.create({
        tenantId,
        userId: nextSigner.user_id,
        type: NotificationType.SIGN_REQUEST_RECEIVED,
        title: 'Đến lượt bạn ký tài liệu',
        message: `Tài liệu "${signRequest.title}" đang chờ bạn ký`,
        metadata: {
          sign_request_id: signRequestId,
          document_id: signRequest.document_id
        }
      });
    }
  }
}
```

### Fix 3: Auto-Activate Next Signer (External Signing)

**File**: `backend/src/modules/public/publicSign.controller.ts` - `submitSignature()`

Logic tương tự nhưng xử lý cả internal và external signers:

```typescript
// ⭐ SEQUENTIAL SIGNING: Activate next signer
const waitingSigners = allSigners.filter(s => s.status === 'waiting_signing');

if (waitingSigners.length > 0) {
  const nextSigner = waitingSigners.sort((a, b) => 
    (a.signing_order || 0) - (b.signing_order || 0)
  )[0];
  
  // Update status
  await prisma.signers.update({
    where: { id: nextSigner.id },
    data: { status: 'pending' }
  });
  
  // Send notification based on signer type
  if (nextSigner.is_internal && nextSigner.user_id) {
    // Internal: In-app notification
    await notificationsService.createNotification({...});
  } else if (!nextSigner.is_internal && nextSigner.signing_token) {
    // External: Email with OTP
    await emailService.sendSignRequestWithOTP({...});
  }
}
```

## Status Workflow

### Signer Status Flow

```
Initial State:
├─ Order 1: pending (ready to sign)
├─ Order 2: waiting_signing (waiting for order 1)
└─ Order 3: waiting_signing (waiting for order 2)

After Order 1 Signs:
├─ Order 1: signed ✅
├─ Order 2: pending (auto-activated) 🔄
└─ Order 3: waiting_signing

After Order 2 Signs:
├─ Order 1: signed ✅
├─ Order 2: signed ✅
└─ Order 3: pending (auto-activated) 🔄

After Order 3 Signs:
├─ Order 1: signed ✅
├─ Order 2: signed ✅
└─ Order 3: signed ✅ → Document completed
```

### Status Definitions

| Status | Meaning | Show in My Tasks? | Can Sign? |
|--------|---------|-------------------|-----------|
| `waiting_approval` | Chờ approval hoàn thành | ❌ No | ❌ No |
| `waiting_signing` | Chờ tới lượt ký | ❌ No | ❌ No |
| `pending` | Đến lượt ký | ✅ Yes | ✅ Yes |
| `otp_sent` | OTP đã gửi, chờ ký | ✅ Yes | ✅ Yes |
| `signed` | Đã ký xong | ✅ Yes (history) | ❌ No |
| `rejected` | Từ chối ký | ✅ Yes (history) | ❌ No |

## Testing

### Test Script 1: Check Activation Logic

**File**: `backend/scripts/test-sequential-signing-activation.js`

Kiểm tra:
- First signer có status đúng không
- Subsequent signers có đúng trạng thái waiting/pending không
- Activation chain có đúng không

```bash
node backend/scripts/test-sequential-signing-activation.js
```

**Expected Output**:
```
✅ Scenario 1: First signer is ready to sign
✅ Scenario 2: Second signer activated after first completed
✅ Sequential signing activation is working correctly!
```

### Test Script 2: Fix Stuck Signers

**File**: `backend/scripts/fix-stuck-sequential-signers.js`

Tự động fix các sign request bị stuck (signer đáng lẽ phải pending nhưng vẫn waiting_signing):

```bash
node backend/scripts/fix-stuck-sequential-signers.js
```

## Verification

### Before Fix
```
Document 030/2025:
  Signer 1: signed ✅
  Signer 2: waiting_signing ❌ (should be pending)
  Signer 3: waiting_signing ✅

My Tasks for Signer 2: Empty ❌
```

### After Fix
```
Document 030/2025:
  Signer 1: signed ✅
  Signer 2: pending ✅ (auto-activated)
  Signer 3: waiting_signing ✅

My Tasks for Signer 2: Shows document ✅
Notification sent to Signer 2 ✅
```

## Files Modified

1. `backend/src/modules/approvals/approvals.service.ts`
   - Fixed `getMyCombinedTasks()` to filter out `waiting_signing` status

2. `backend/src/modules/signRequests/signRequests.service.ts`
   - Added auto-activation logic in `signInternal()`

3. `backend/src/modules/public/publicSign.controller.ts`
   - Enhanced auto-activation logic in `submitSignature()` to handle both internal and external signers

## Scripts Created

1. `backend/scripts/test-sequential-signing-activation.js`
   - Test script to verify activation logic

2. `backend/scripts/fix-stuck-sequential-signers.js`
   - Utility script to fix existing stuck sign requests

## Impact

✅ **Positive**:
- Sequential signing workflow now works correctly
- Signers are automatically notified when it's their turn
- My Tasks page shows correct pending tasks
- Better user experience

⚠️ **Breaking Changes**: None

🔄 **Migration Required**: 
- Run `fix-stuck-sequential-signers.js` to fix existing stuck sign requests

## Related Issues

- Related to progressive PDF generation (completed earlier)
- Related to status workflow confusion (fixed in this session)

## Next Steps

1. ✅ Test with real users
2. ✅ Monitor notification delivery
3. ⏳ Consider adding email notifications for internal signers (optional)
4. ⏳ Add webhook events for signer activation (future enhancement)
