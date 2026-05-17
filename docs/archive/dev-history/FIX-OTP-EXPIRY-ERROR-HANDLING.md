# Fix: OTP Expiry Error Handling

**Date:** 2025-11-28  
**Status:** ✅ Fixed

## Problem

Khi OTP hết hạn, hệ thống không bắt được lỗi đúng và báo "ký không thành công" thay vì "OTP đã hết hạn".

## Root Cause

Backend trả về error trong format:
```json
{
  "success": false,
  "error": {
    "message": "OTP expired",
    "code": "BAD_REQUEST"
  }
}
```

Nhưng frontend đang check `result.message` thay vì `result.error.message`, nên không bắt được message "OTP expired" để hiển thị thông báo phù hợp.

## Solution

### Backend (No changes needed)

Backend đã hoạt động đúng:
- `publicSign.controller.ts` line 379-382: Kiểm tra OTP expiry và throw error đúng
- `errorHandler.ts`: Format error response đúng chuẩn

```typescript
// publicSign.controller.ts
if (signer.otp_expire < new Date()) {
  console.log('❌ OTP expired');
  throw ApiError.badRequest('OTP expired');
}
```

### Frontend Changes

Updated `frontend/app/sign/[token]/page.tsx` to check both `result.error.message` and `result.message`:

#### 1. fetchSigningData()
```typescript
const errorMsg = result.error?.message || result.message || 'Failed to load signing data';
```

#### 2. handleSendOtp()
```typescript
const errorMsg = result.error?.message || result.message || 'Không thể gửi OTP';
```

#### 3. handleSubmitSignature()
```typescript
const errorMsg = result.error?.message || result.message || 'Không thể ký tài liệu';

if (errorMsg.includes('OTP expired')) {
  errorMessage = '⏰ Mã OTP đã hết hạn. Vui lòng click "Gửi mã OTP" để nhận mã mới.';
}
```

#### 4. downloadSignedPdf()
```typescript
const errorMsg = result.error?.message || result.message || 'Không thể tải xuống PDF';
```

## Testing

Created test script: `backend/scripts/test-otp-expiry.js`

Test results:
- ✅ OTP expiry detection: Working correctly
- ✅ Error message format: Standardized
- ✅ Frontend error handling: Updated to check result.error.message

## Error Messages

Now users will see appropriate messages:

| Scenario | Message |
|----------|---------|
| OTP expired | ⏰ Mã OTP đã hết hạn. Vui lòng click "Gửi mã OTP" để nhận mã mới. |
| Invalid OTP | ❌ Mã OTP không đúng. Vui lòng kiểm tra lại mã OTP trong email. |
| OTP not issued | 📧 Chưa có mã OTP. Vui lòng click "Gửi mã OTP" trước. |
| Already signed | ✅ Bạn đã ký tài liệu này rồi. Trang sẽ tự động tải lại để hiển thị kết quả. |

## Files Changed

- `frontend/app/sign/[token]/page.tsx` - Updated error handling in 4 places
- `backend/scripts/test-otp-expiry.js` - New test script

## Related Issues

- Session 2025-11-27: Added resend OTP functionality
- This fix ensures the resend OTP feature is properly triggered when OTP expires
