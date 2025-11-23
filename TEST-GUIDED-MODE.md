# Test Guided Signing Mode

## Test URL
```
http://localhost:3000/sign/8eb20c827099ac688918a8913bda9ba3edc0e7c12b19b5e6fe8ae3da3a4c31a4
```

## Test Credentials
- **Email**: signer@example.com
- **OTP**: 541796

## Test Steps

### 1. Open Signing Page
- [ ] Open URL in browser
- [ ] Page loads successfully
- [ ] See document title and signer info

### 2. Verify OTP
- [ ] Email field shows: signer@example.com
- [ ] Click "Gửi mã OTP" (or skip if already sent)
- [ ] Enter OTP: 541796
- [ ] OTP field accepts 6 digits

### 3. Start Guided Mode
- [ ] See "Bắt đầu" button (blue gradient)
- [ ] Button shows: "🎯 Chế độ hướng dẫn ký"
- [ ] Click "Bắt đầu"

### 4. Verify Guided Mode Active
- [ ] ✅ Progress header appears at top
- [ ] ✅ Shows "Bước 1 / 6" (or similar)
- [ ] ✅ Progress bar shows 0%
- [ ] ✅ Signature section disappears
- [ ] ✅ First field highlighted (blue + pulse + ring)
- [ ] ✅ Other fields disabled (gray + opacity 50%)

### 5. Sign First Field
- [ ] Click on blue highlighted field
- [ ] Canvas opens inline (NOT modal)
- [ ] Draw signature
- [ ] Click "✓ Xong"
- [ ] Field turns green with checkmark
- [ ] Auto-scroll to next field

### 6. Continue Signing
- [ ] Progress updates: "Bước 2 / 6"
- [ ] Progress bar: 16.67%
- [ ] Second field highlighted
- [ ] Sign second field
- [ ] Repeat for all fields

### 7. Complete All Fields
- [ ] After last field: "🎉 Đã ký xong tất cả!"
- [ ] Guided mode exits automatically
- [ ] Signature section reappears
- [ ] "Hoàn tất ký" button enabled

### 8. Submit Signature
- [ ] Click "📤 Hoàn tất ký"
- [ ] Success message
- [ ] Page shows "Đã ký thành công"

## Expected Console Logs

```
🚀 handleStartGuided called
📧 otpSent: true
🔢 otp: 541796
✅ Setting guidedMode to TRUE

🔄 PDFSigningViewer render - guidedMode: true
🔄 currentFieldId: 123
🔄 completedFieldIds: []

✍️ Signature done for field: 123
🎯 Guided mode: true
📞 onFieldComplete exists: true
📞 Calling onFieldComplete

🎯 Field completed: 123
📊 Current index: 0
📋 Total fields: 6
➡️ Moving to next field, index: 1
🎯 Next field ID: 124
```

## Common Issues

### Issue 1: Signature Modal Opens
**Symptom**: Modal opens instead of inline canvas
**Fix**: Check `guidedMode` prop passed to PDFSigningViewer

### Issue 2: Fields Not Highlighted
**Symptom**: All fields look the same
**Fix**: Check `currentFieldId` and `completedFieldIds` props

### Issue 3: No Auto-Scroll
**Symptom**: Stays on same field after signing
**Fix**: Check `onFieldComplete` callback

### Issue 4: Progress Not Updating
**Symptom**: Progress bar stuck at 0%
**Fix**: Check `completedFields` state update

## Debug Commands

```bash
# Check fields in database
cd backend
node scripts/check-fields.js

# Get new OTP
node scripts/get-otp.js signer@example.com

# Check sign request status
node scripts/check-sign-requests.js
```

## Success Criteria

✅ All 8 test steps pass
✅ No signature modal opens in guided mode
✅ Fields highlight correctly
✅ Auto-scroll works
✅ Progress updates correctly
✅ Can complete all fields
✅ Can submit successfully
