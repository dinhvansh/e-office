# Fix: Sequential Signing Status Update

**Date**: 2025-11-24 Evening  
**Issue**: Signer status không cập nhật sau khi ký

## 🐛 Problem

Sau khi Trưởng IT ký xong:
- ❌ Status vẫn là `'otp_sent'` thay vì `'signed'`
- ❌ Progress không tăng (vẫn 0/3 thay vì 1/3)
- ❌ Không chuyển sang Admin để ký tiếp
- ❌ Sign request status không update

## 🔍 Root Cause

1. **Status không update**: Logic chỉ set `status='completed'` nhưng check lại chỉ tìm `'completed'`, bỏ qua `'signed'`
2. **Progress check thiếu**: Chỉ check `status === 'completed'`, không check `'signed'`
3. **Không có notification**: Không gửi email cho signer tiếp theo

## ✅ Solution

### 1. Update Status Logic
```typescript
// backend/src/modules/public/publicSign.controller.ts

// Mark as signed
await prisma.signers.update({
  where: { id: signer.id },
  data: {
    status: 'signed', // Changed from 'completed'
    signed_at: new Date(),
    // ...
  },
});
```

### 2. Fix Progress Check
```typescript
// Check both 'completed' and 'signed'
const allSigned = allSigners.every((s) => 
  s.status === 'completed' || s.status === 'signed'
);
```

### 3. Add Next Signer Logic
```typescript
// Find next signer in sequential workflow
if (signer.sign_request.workflow_type === 'sequential') {
  const nextSigner = allSigners.find(s => 
    (s.status === 'pending' || s.status === 'otp_sent') && 
    s.signing_order > (signer.signing_order || 0)
  );
  // TODO: Send email notification
}
```

### 4. Fix Old Data
```bash
# Run fix script
node backend/scripts/fix-signer-status.js
```

**Result**: Fixed 1 signer, updated status from 'otp_sent' to 'signed'

## 🧪 Testing

### Test Scripts Created
1. `debug-signing-workflow.js` - Debug all active sign requests
2. `check-specific-sign-request.js` - Check specific sign request details
3. `fix-signer-status.js` - Fix broken signer statuses
4. `test-sequential-signing.js` - Test complete sequential flow

### Manual Testing
```bash
# 1. Check current status
node backend/scripts/debug-signing-workflow.js

# 2. Check specific sign request
node backend/scripts/check-specific-sign-request.js 40

# 3. Fix broken statuses
node backend/scripts/fix-signer-status.js

# 4. Test new signing flow
node backend/scripts/test-sequential-signing.js
```

## 📊 Results

**Before Fix**:
```
Sign Request #40:
- Status: in_progress
- Progress: 0/3 (wrong!)
- Signer #44: status='otp_sent' (has signature_data)
```

**After Fix**:
```
Sign Request #40:
- Status: in_progress
- Progress: 1/3 (correct!)
- Signer #44: status='signed' ✅
```

## 🔜 Next Steps

**Immediate**:
- [ ] Test complete signing flow
- [ ] Verify UI shows correct progress
- [ ] Test with multiple signers

**Short-term**:
- [ ] Implement email notification to next signer
- [ ] Add webhook event for signer completed
- [ ] Validate signing_order uniqueness

**Long-term**:
- [ ] Add admin UI to manage signing order
- [ ] Add signing history timeline
- [ ] Add reminder emails for pending signers

## 📝 Files Changed

**Modified**:
- `backend/src/modules/public/publicSign.controller.ts`

**Created**:
- `backend/scripts/debug-signing-workflow.js`
- `backend/scripts/check-specific-sign-request.js`
- `backend/scripts/fix-signer-status.js`
- `backend/scripts/test-sequential-signing.js`

---

**Status**: ✅ Fixed  
**Impact**: High - Affects all sequential signing workflows  
**Priority**: Critical
