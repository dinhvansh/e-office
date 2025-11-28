# Feature: Resend Sign Request

## Overview
Cho phép gửi lại email thông báo ký cho các sign request đã được gửi trước đó.

## Implementation Status
✅ **COMPLETED** - Logic đã được implement và hoạt động đúng

## Logic Details

### Status Validation
```typescript
// ✅ Allow resend: Only block if completed or cancelled
if (signRequest.status === "completed" || signRequest.status === "cancelled") {
  throw ApiError.badRequest(
    `Cannot send sign request with status: ${signRequest.status}`, 
    "SIGN_REQUEST_INVALID_STATUS"
  );
}
```

**Allowed statuses for resend:**
- `draft` - Lần đầu gửi
- `pending` - Đã gửi, có thể gửi lại
- `sent` - Đã gửi, có thể gửi lại  
- `in_progress` - Đang ký, có thể gửi lại
- `otp_sent` - Đã gửi OTP, có thể gửi lại

**Blocked statuses:**
- `completed` - Đã hoàn thành, không thể gửi lại
- `cancelled` - Đã hủy, không thể gửi lại

### Token Regeneration
```typescript
// ✅ Generate/regenerate signing tokens for all signers
const signers = await signersRepository.findBySignRequest(id);
for (const signer of signers) {
  // Generate new token if missing or regenerate for resend
  if (!signer.signing_token || signRequest.status !== "draft") {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await signersRepository.update(signer.id, { 
      signing_token: token,
      token_expires_at: expiresAt
    });
  }
}
```

**Token behavior:**
- Nếu sign request là `draft`: Tạo token mới cho signers chưa có token
- Nếu sign request đã `sent/pending`: Regenerate token mới cho tất cả signers (để resend)
- Token có thời hạn 30 ngày

### Email Sending Logic
```typescript
// ⭐ SEQUENTIAL SIGNING: Only send emails to signers with status 'pending'
const pendingSigners = signersWithTokens.filter(s => s.status === 'pending');
const waitingSigners = signersWithTokens.filter(s => s.status === 'waiting_signing');

console.log(`📧 Sending emails to ${pendingSigners.length} pending signers (${waitingSigners.length} waiting)...`);

for (const signer of pendingSigners) {
  if (!signer.is_internal && signer.signing_token) {
    // Send email with OTP
    await emailService.sendSignRequestWithOTP({...});
  }
}
```

**Email behavior:**
- Chỉ gửi email cho signers có status `pending`
- Signers có status `waiting_signing` sẽ nhận email sau khi người trước ký xong
- Signers có status `waiting_approval` sẽ nhận email sau khi approval hoàn thành
- Internal signers không nhận email (ký trực tiếp trong hệ thống)

## Use Cases

### 1. Resend to External Signers
**Scenario:** External signer chưa nhận được email hoặc email bị mất

**Steps:**
1. Admin vào trang Sign Requests
2. Click "Resend" button trên sign request đã gửi
3. System regenerate tokens và gửi lại email với OTP mới

**Result:** External signer nhận được email mới với signing link và OTP mới

### 2. Resend After Partial Signing
**Scenario:** Một số signers đã ký, cần nhắc nhở những người chưa ký

**Steps:**
1. Admin click "Resend" trên sign request đang `in_progress`
2. System chỉ gửi email cho signers có status `pending`
3. Signers đã ký (`signed`) không nhận email

**Result:** Chỉ những người chưa ký nhận được email nhắc nhở

### 3. Cannot Resend Completed
**Scenario:** Sign request đã hoàn thành

**Steps:**
1. Admin cố gắng resend sign request có status `completed`
2. System throw error: "Cannot send sign request with status: completed"

**Result:** Không thể resend, phải dùng "Revoke" nếu muốn ký lại

## API Endpoint

```
POST /api/sign-requests/:id/send
```

**Authorization:** Bearer token required

**Response:**
```json
{
  "success": true,
  "data": {
    "sign_request": {
      "id": 123,
      "status": "pending",
      "title": "Contract Agreement",
      ...
    }
  }
}
```

**Error Response (Completed/Cancelled):**
```json
{
  "success": false,
  "error": "Cannot send sign request with status: completed",
  "code": "SIGN_REQUEST_INVALID_STATUS"
}
```

## Testing

### Manual Test
1. Create a sign request with external signers
2. Send it (status becomes `pending`)
3. Click "Resend" button
4. Verify:
   - ✅ No error thrown
   - ✅ New tokens generated
   - ✅ Emails sent to pending signers
   - ✅ OTP regenerated

### Automated Test Script
```bash
cd backend/scripts
node test-resend-logic.js
```

## Related Files
- `backend/src/modules/signRequests/signRequests.service.ts` - Main logic
- `backend/src/modules/signRequests/signRequests.controller.ts` - API endpoint
- `backend/src/modules/common/email.service.ts` - Email sending
- `backend/scripts/test-resend-logic.js` - Test script

## Notes
- ✅ Logic đã được implement đúng từ session trước
- ✅ Không cần sửa gì thêm
- ✅ Resend hoạt động cho tất cả statuses trừ `completed` và `cancelled`
- ✅ Token được regenerate tự động khi resend
- ✅ OTP mới được tạo cho mỗi lần resend

## Future Enhancements
- [ ] Add "Resend" button in frontend UI
- [ ] Add confirmation dialog before resending
- [ ] Track resend count and last resend time
- [ ] Add rate limiting to prevent spam
- [ ] Send notification to admin after successful resend
