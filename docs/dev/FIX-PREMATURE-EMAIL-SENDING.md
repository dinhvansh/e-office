# Fix: Premature Email Sending to Signers

**Date:** 2025-11-27  
**Status:** ✅ FIXED  
**Issue:** Signers nhận email TRƯỚC KHI approvals hoàn thành

## Vấn Đề

Khi tạo document với workflow có cả approver và signer steps:

**Expected:**
1. Tạo document → Signers status = `waiting_approval`
2. Complete approvals → Signers status = `pending` → Gửi email
3. Signers ký

**Actual (BUG):**
1. Tạo document → Signers status = `waiting_approval` ✅
2. Bấm "Gửi đi ký" → **Email gửi NGAY** ❌
3. External signers nhận email và OTP TRƯỚC KHI approvals xong ❌

## Nguyên Nhân

Trong `signRequests.service.ts`, method `sendSignRequest()`:

```typescript
// OLD CODE (BUG):
async sendSignRequest(id, tenantId, userId) {
  // ... validate ...
  
  // Generate tokens
  for (const signer of signers) {
    const token = crypto.randomBytes(32).toString("hex");
    await signersRepository.update(signer.id, { signing_token: token });
  }
  
  // Send emails to ALL external signers
  for (const signer of signersWithTokens) {
    if (!signer.is_internal && signer.signing_token) {
      // ❌ Gửi email NGAY, không check status
      await emailService.sendSignRequestWithOTP(...);
      await signersRepository.update(signer.id, { status: 'otp_sent' });
    }
  }
}
```

**Vấn đề:** Không kiểm tra xem signers có đang `waiting_approval` hay không.

## Giải Pháp

Thêm logic kiểm tra TRƯỚC KHI gửi email:

```typescript
// NEW CODE (FIXED):
async sendSignRequest(id, tenantId, userId) {
  // ... validate ...
  
  // Generate tokens
  for (const signer of signers) {
    const token = crypto.randomBytes(32).toString("hex");
    await signersRepository.update(signer.id, { signing_token: token });
  }
  
  // ✅ CHECK if signers are waiting for approval
  const waitingForApproval = signersWithTokens.some(s => s.status === 'waiting_approval');
  
  if (waitingForApproval) {
    console.log(`⏳ Sign request ${id} has signers waiting for approval. Emails will be sent after approvals complete.`);
    // Don't send emails yet - they will be sent by autoSendSignRequest after approvals
    return this.getSignRequest(id, tenantId);
  }
  
  // ✅ Only send emails if NO approvals pending
  for (const signer of signersWithTokens) {
    if (!signer.is_internal && signer.signing_token) {
      await emailService.sendSignRequestWithOTP(...);
      await signersRepository.update(signer.id, { status: 'otp_sent' });
    }
  }
}
```

## Flow Đúng

### Scenario 1: Document CÓ Approvals

```
1. CREATE DOCUMENT
   ↓
   - Workflow: 2 approver steps + 2 signer steps
   - Approvals created: status = 'pending'
   - Signers created: status = 'waiting_approval'
   ↓
2. USER BẤM "GỬI ĐI KÝ"
   ↓
   - sendSignRequest() called
   - Generate signing tokens
   - Check: waitingForApproval = true
   - ⏳ SKIP sending emails
   - Return early
   ↓
3. APPROVERS APPROVE
   ↓
   - Approval 1: approved
   - Approval 2: approved
   - All approvals complete
   ↓
4. AUTO-SEND TRIGGERED
   ↓
   - autoSendSignRequest() called
   - Update signers: 'waiting_approval' → 'pending'
   - Generate OTP
   - 📧 Send emails NOW
   ↓
5. SIGNERS SIGN
```

### Scenario 2: Document KHÔNG CÓ Approvals

```
1. CREATE DOCUMENT
   ↓
   - No workflow or workflow without approver steps
   - Signers created: status = 'pending'
   ↓
2. USER BẤM "GỬI ĐI KÝ"
   ↓
   - sendSignRequest() called
   - Generate signing tokens
   - Check: waitingForApproval = false
   - 📧 Send emails IMMEDIATELY
   ↓
3. SIGNERS SIGN
```

## Testing

### Test Case 1: With Approvals

```bash
# 1. Create document with workflow ID 9 (has approvers + signers)
# 2. Add fields and click "Gửi đi ký"
# 3. Check signers status
node backend/scripts/check-latest-document.js
```

**Expected:**
- Signers status = `waiting_approval`
- NO emails sent
- NO OTP generated

### Test Case 2: After Approvals Complete

```bash
# 1. Complete all approvals
# 2. Check signers status
node backend/scripts/check-latest-document.js
```

**Expected:**
- Signers status = `pending` or `otp_sent`
- Emails sent
- OTP generated

### Test Case 3: Without Approvals

```bash
# 1. Create document without workflow
# 2. Add signers manually
# 3. Click "Gửi đi ký"
```

**Expected:**
- Emails sent immediately
- Signers can sign right away

## Files Modified

- `backend/src/modules/signRequests/signRequests.service.ts`
  - Method: `sendSignRequest()`
  - Added check for `waiting_approval` status
  - Skip email sending if approvals pending

## Related

- Workflow Order Refactor: `SESSION-2025-11-27-WORKFLOW-ORDER-REFACTOR.md`
- Auto-send after approvals: `approvals.service.ts` → `autoSendSignRequest()`

## Summary

✅ **Fixed:** Signers không còn nhận email trước khi approvals xong
✅ **Logic:** Check `waiting_approval` status trước khi gửi email
✅ **Flow:** Approve → Activate signers → Send emails
