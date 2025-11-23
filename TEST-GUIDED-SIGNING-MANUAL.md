# Manual Test: Guided Signing Flow

## 🎯 Test Information

**Sign Request ID**: 40  
**Signer Email**: dir.it@acme.local  
**Signer Name**: Phạm Minh Tuấn  
**OTP**: 318139  
**Test URL**: http://localhost:3000/sign/7b627ea3f971f174f6dd7f3f3d5fd709372cf42b337779bcf77ed3b9196b9d0d

**Fields**: 6 fields total (3 signers × 2 fields each)

---

## ✅ Test Checklist

### 1. Open Signing Page
- [ ] Open URL in browser
- [ ] Page loads without errors
- [ ] See document title
- [ ] See email input field
- [ ] See "Gửi mã OTP" button

**Expected**: Clean signing page with email verification form

---

### 2. Email Verification
- [ ] Enter email: `dir.it@acme.local`
- [ ] Click "Gửi mã OTP"
- [ ] See OTP input field appear
- [ ] See success message

**Expected**: OTP sent (check console logs if email not configured)

---

### 3. OTP Verification
- [ ] Enter OTP: `318139`
- [ ] Click "Xác nhận"
- [ ] OTP verified successfully
- [ ] PDF document appears
- [ ] See signature fields on PDF
- [ ] See "Bắt đầu" button (Start Guided Mode)

**Expected**: PDF loaded with fields visible, guided mode button shown

---

### 4. Start Guided Mode
- [ ] Click "Bắt đầu" button
- [ ] Progress header appears at top
- [ ] Shows "Tiến độ ký: 1 / X"
- [ ] Progress bar shows 0%
- [ ] First field is highlighted (blue border + pulse)
- [ ] Page auto-scrolls to first field
- [ ] Other fields are disabled (gray + opacity)

**Expected**: Guided mode activated, first field highlighted and focused

---

### 5. Sign First Field
- [ ] Click on highlighted field
- [ ] Signature canvas appears inline
- [ ] Draw signature with mouse/touch
- [ ] See signature preview
- [ ] Click "✓ Xong" button
- [ ] Field shows green checkmark
- [ ] Progress updates: "2 / X"
- [ ] Progress bar increases
- [ ] Auto-scroll to next field
- [ ] Next field highlighted

**Expected**: Smooth transition to next field with progress update

---

### 6. Sign Remaining Fields
- [ ] Repeat for each field:
  - Click field
  - Draw signature
  - Click "✓ Xong"
  - Progress updates
  - Auto-scroll to next
- [ ] Progress bar reaches 100%
- [ ] Toast notification: "🎉 Đã ký xong tất cả!"
- [ ] Confirmation dialog appears

**Expected**: All fields signed, completion dialog shown

---

### 7. Submit Signatures
- [ ] Click "OK" in confirmation dialog
- [ ] OR scroll down and click "Hoàn tất ký"
- [ ] Loading state shown
- [ ] Success message appears
- [ ] Thank you screen shown
- [ ] Document information displayed

**Expected**: Signatures submitted successfully

---

## 🐛 Bug Tracking

### Issues Found
| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 |       |          |        |
| 2 |       |          |        |
| 3 |       |          |        |

### Notes
```
Add any observations, bugs, or improvements here:

```

---

## 📱 Mobile Testing

### Responsive Design
- [ ] Test on mobile viewport (375px width)
- [ ] Progress header responsive
- [ ] PDF scales correctly
- [ ] Fields are tappable
- [ ] Canvas works with touch
- [ ] Buttons are large enough
- [ ] Text is readable

### Touch Gestures
- [ ] Tap to select field
- [ ] Draw signature with finger
- [ ] Pinch to zoom PDF (if supported)
- [ ] Scroll works smoothly

---

## 🎨 UI/UX Observations

### Visual Design
- [ ] Colors are consistent
- [ ] Animations are smooth
- [ ] Progress bar is clear
- [ ] Field highlighting is obvious
- [ ] Checkmarks are visible

### User Experience
- [ ] Flow is intuitive
- [ ] Instructions are clear
- [ ] Feedback is immediate
- [ ] Errors are helpful
- [ ] Success states are satisfying

---

## ⚡ Performance

- [ ] Page loads quickly (< 2s)
- [ ] PDF renders fast (< 3s)
- [ ] Auto-scroll is smooth
- [ ] No lag when drawing
- [ ] Transitions are fluid

---

## 🔧 Technical Checks

### Console Logs
- [ ] No JavaScript errors
- [ ] No React warnings
- [ ] API calls successful
- [ ] WebSocket connected (if used)

### Network
- [ ] Check Network tab
- [ ] All API calls return 200
- [ ] No failed requests
- [ ] Reasonable payload sizes

---

## ✅ Test Result

**Overall Status**: [ ] PASS / [ ] FAIL

**Summary**:
```
Write overall test summary here:
- What worked well?
- What needs improvement?
- Any blockers?
```

**Tested By**: _______________  
**Date**: _______________  
**Browser**: _______________  
**Device**: _______________

---

## 🔄 Re-test After Fixes

If bugs found, re-run this checklist after fixes:

**Re-test #1**:
- Date: _______________
- Status: [ ] PASS / [ ] FAIL
- Notes: _______________

**Re-test #2**:
- Date: _______________
- Status: [ ] PASS / [ ] FAIL
- Notes: _______________

---

## 💡 Improvement Ideas

```
List any ideas for improvements:
1. 
2. 
3. 
```

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Check backend logs: `getProcessOutput processId:5`
3. Check frontend logs: `getProcessOutput processId:7`
4. Run: `node scripts/quick-test-guided.js` to get fresh OTP
5. Ask for help with specific error messages

---

**Ready to test!** 🚀

Open the URL and follow the checklist step by step.
