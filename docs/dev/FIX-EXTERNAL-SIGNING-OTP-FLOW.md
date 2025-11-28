# Fix: External Signing OTP Flow with Verification

## Problem
External signers cần xác thực OTP trước khi có thể ký tài liệu, với feedback rõ ràng về trạng thái OTP (đúng/sai/hết hạn).

## Solution
Thêm endpoint verify OTP và nút "Xác thực OTP" để validate OTP với backend trước khi cho phép ký.

### Backend: New Verify OTP Endpoint
```typescript
// POST /public/sign/:token/verify-otp
verifyOtp = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.params;
  const { otp } = z.object({ otp: z.string().length(6) }).parse(req.body);

  const signer = await prisma.signers.findUnique({
    where: { signing_token: token },
  });

  if (!signer) {
    throw ApiError.notFound('Invalid signing link', 'INVALID_TOKEN');
  }

  // Check if OTP exists
  if (!signer.otp) {
    throw ApiError.badRequest('OTP not issued. Please request OTP first.', 'OTP_NOT_ISSUED');
  }

  // Check if OTP expired
  if (signer.otp_expire && new Date() > signer.otp_expire) {
    throw ApiError.badRequest('OTP expired. Please request a new OTP.', 'OTP_EXPIRED');
  }

  // Verify OTP
  const bcrypt = require('bcrypt');
  const isValid = await bcrypt.compare(otp, signer.otp);

  if (!isValid) {
    throw ApiError.badRequest('Invalid OTP. Please check your email.', 'INVALID_OTP');
  }

  res.json(ok({ 
    verified: true,
    message: 'OTP verified successfully'
  }));
};
```

### Frontend: Verify OTP Logic
```typescript
const handleVerifyOtp = async () => {
  if (!otp || otp.length !== 6) {
    toast.error('Vui lòng nhập đầy đủ mã OTP (6 số)');
    return;
  }

  setVerifying(true);
  try {
    const res = await fetch(`${apiBase}/public/sign/${token}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp }),
    });

    const result = await res.json();

    if (!res.ok) {
      // Handle specific error codes
      if (result.error?.code === 'OTP_EXPIRED') {
        throw new Error('⏰ Mã OTP đã hết hạn. Vui lòng click "Gửi lại OTP".');
      } else if (result.error?.code === 'INVALID_OTP') {
        throw new Error('❌ Mã OTP không đúng. Vui lòng kiểm tra lại.');
      } else if (result.error?.code === 'OTP_NOT_ISSUED') {
        throw new Error('📧 Chưa có mã OTP. Vui lòng click "Gửi lại OTP".');
      }
      throw new Error(result.error?.message || 'Mã OTP không hợp lệ');
    }

    setOtpVerified(true);
    toast.success('✅ Xác thực thành công! Bạn có thể bắt đầu ký tài liệu.');
  } catch (error: any) {
    toast.error(error.message);
    setOtpVerified(false);
  } finally {
    setVerifying(false);
  }
};
```

## Changes Made

### 1. Remove `otpVerified` and `verifying` States
```typescript
// ❌ Old
const [otpVerified, setOtpVerified] = useState(false);
const [verifying, setVerifying] = useState(false);

// ✅ New - Removed these states
```

### 2. Remove `handleVerifyOtp` Function
Không cần verify OTP ở frontend. Verification sẽ xảy ra khi submit signature.

### 3. Update Conditional Rendering
```typescript
// ❌ Old - Require otpVerified
{!guidedMode && otpVerified && myFields.length > 0 && ...}

// ✅ New - Only require OTP entered
{!guidedMode && otp && otp.length === 6 && myFields.length > 0 && ...}
```

### 4. Simplify OTP Input UI
```typescript
// ✅ New UI with clear instructions
<div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
  <p className="text-sm text-blue-900 font-medium mb-1">
    📧 Mã OTP đã được gửi trong email yêu cầu ký
  </p>
  <p className="text-xs text-blue-700">
    ✅ Nhập mã OTP từ email và bắt đầu ký ngay<br/>
    🔄 Nếu không tìm thấy hoặc hết hạn, nhấn "Gửi lại OTP" bên dưới
  </p>
</div>
```

### 5. Remove "Xác thực OTP" Button
Chỉ giữ lại button "Gửi lại OTP" cho trường hợp OTP hết hạn.

## User Flow

### Current Flow (With Verification)
1. ✅ External signer nhận email với OTP
2. ✅ Click link trong email
3. ✅ Nhập OTP từ email (6 số)
4. ✅ Click "Xác thực OTP"
5. ✅ System verify OTP với backend:
   - ✅ Đúng → Hiển thị "Xác thực thành công" + Enable signing options
   - ❌ Sai → Hiển thị "Mã OTP không đúng"
   - ⏰ Hết hạn → Hiển thị "Mã OTP đã hết hạn"
6. ✅ Chọn mode ký (Guided hoặc Modal)
7. ✅ Ký tài liệu
8. ✅ Submit signature

## Testing

### Test Case 1: Valid OTP
1. Admin tạo sign request với external signer
2. Admin click "Gửi yêu cầu ký số"
3. External signer nhận email với OTP
4. External signer click link trong email
5. External signer nhập OTP từ email
6. Click "Xác thực OTP"
7. ✅ Verify: Success message "Xác thực thành công!"
8. ✅ Verify: Signing options (Guided/Modal) hiển thị
9. External signer chọn mode và ký
10. ✅ Verify: Signature submitted successfully

### Test Case 2: Invalid OTP
1. External signer nhập sai OTP (e.g., 123456 thay vì 789012)
2. Click "Xác thực OTP"
3. ✅ Verify: Error "❌ Mã OTP không đúng"
4. ✅ Verify: Signing options KHÔNG hiển thị
5. Nhập đúng OTP
6. Click "Xác thực OTP"
7. ✅ Verify: Success và có thể ký

### Test Case 3: Expired OTP
1. External signer truy cập link sau 10 phút
2. Nhập OTP cũ từ email
3. Click "Xác thực OTP"
4. ✅ Verify: Error "⏰ Mã OTP đã hết hạn"
5. Click "Gửi lại OTP"
6. Nhận OTP mới qua email
7. Nhập OTP mới
8. Click "Xác thực OTP"
9. ✅ Verify: Success và có thể ký

### Test Case 4: No OTP Issued
1. External signer truy cập link mới (chưa có OTP)
2. Nhập random OTP
3. Click "Xác thực OTP"
4. ✅ Verify: Error "📧 Chưa có mã OTP"
5. Click "Gửi lại OTP"
6. Nhận OTP qua email
7. Nhập OTP
8. Click "Xác thực OTP"
9. ✅ Verify: Success và có thể ký

## Related Files
- `frontend/app/sign/[token]/page.tsx` - Main signing page
- `backend/src/modules/signRequests/signRequests.service.ts` - OTP generation
- `backend/src/modules/common/email.service.ts` - Email sending

## Backend OTP Flow (No Changes Needed)
1. Admin clicks "Gửi yêu cầu ký số"
2. Backend generates OTP for each external signer
3. Backend sends email with OTP and signing link
4. Signer status: `pending` → `otp_sent`
5. External signer submits signature with OTP
6. Backend verifies OTP
7. If valid: Sign document
8. If invalid/expired: Return error

## Notes
- ✅ OTP verification happens on backend during signature submission
- ✅ Frontend không cần pre-verify OTP
- ✅ User experience improved significantly
- ✅ No breaking changes to backend
- ✅ Backward compatible with existing sign requests

## Deployment
1. Deploy frontend changes
2. No backend changes needed
3. Test with existing sign requests
4. Monitor for any issues

## Success Metrics
- ✅ External signers can sign immediately after entering OTP
- ✅ No confusion about "sending OTP first"
- ✅ Reduced support tickets about signing flow
- ✅ Improved completion rate for sign requests
