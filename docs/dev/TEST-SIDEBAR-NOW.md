# 🧪 Test Sidebar & Thank You Page - NOW!

## 📋 Test Information

**Sign Request**: #40  
**Email**: vanqn95@gmail.com  
**OTP**: 496179  
**Expires**: 11/24/2025, 1:54:14 AM (10 minutes)

**Test URL**:
```
http://localhost:3000/sign/95112e993f2cc2e135cf788f10ed7cf8a251146109da4fdd77f107f15f4110a9
```

---

## ✅ Test Checklist

### Step 1: Open Signing Page
- [ ] Copy URL above
- [ ] Paste in browser
- [ ] Page loads successfully
- [ ] See email input field
- [ ] **NO SIDEBAR YET** (only shows after OTP)

**Expected**: Clean page with email verification form

---

### Step 2: Enter Email & Send OTP
- [ ] Email field shows: `vanqn95@gmail.com`
- [ ] Click "Gửi mã OTP" button
- [ ] See OTP input field appear
- [ ] Toast: "Mã OTP đã được gửi"

**Expected**: OTP input field appears

---

### Step 3: Enter OTP & Verify
- [ ] Enter OTP: `496179`
- [ ] Click "Xác nhận" button
- [ ] OTP verified successfully
- [ ] **SIDEBAR APPEARS ON LEFT** ⭐
- [ ] PDF document loads
- [ ] See signature fields

**Expected**: 
- ✅ Sidebar visible (320px width)
- ✅ Shows status badge
- ✅ Shows document info
- ✅ Shows 3 signers
- ✅ Shows activity history

---

### Step 4: Check Sidebar Content

#### Status Badge
- [ ] Shows "Đang chờ ký (X/3)"
- [ ] Progress bar visible
- [ ] Progress percentage shown

#### Document Info
- [ ] Người tạo: Shows name
- [ ] Ngày gửi: Shows date
- [ ] Ngày hết hạn: Shows deadline (if any)
- [ ] Mã tài liệu: Shows document code

#### Signers List
- [ ] Shows 3 signers
- [ ] Each signer has:
  - Avatar with status icon
  - Name
  - Email
  - Status badge (Đã ký/Chờ ký/Đã từ chối)
  - Signed timestamp (if signed)
- [ ] Current signer highlighted (blue background)

#### Activity History
- [ ] Shows activity timeline
- [ ] Each activity has:
  - Icon (✓ for signed, 👁️ for viewed)
  - User name
  - Action description
  - Timestamp
- [ ] Activities sorted by time (newest first)

---

### Step 5: Test Guided Signing
- [ ] Click "Bắt đầu" button
- [ ] Progress header appears at top
- [ ] First field highlighted
- [ ] Auto-scroll to field
- [ ] Sign field
- [ ] Progress updates in header
- [ ] **Check sidebar progress bar updates** ⭐
- [ ] Continue signing all fields

**Expected**: Sidebar progress bar updates as you sign

---

### Step 6: Submit Signatures
- [ ] Complete all fields
- [ ] Toast: "🎉 Đã ký xong tất cả!"
- [ ] Confirmation dialog appears
- [ ] Click "OK" to submit
- [ ] Loading state shown
- [ ] **THANK YOU PAGE APPEARS** ⭐

---

### Step 7: Check Thank You Page

#### Header
- [ ] Gradient background (green to blue)
- [ ] Animated checkmark icon (bouncing)
- [ ] Title: "🎉 Cảm ơn bạn!"
- [ ] Subtitle: "Tài liệu đã được ký thành công"

#### Signing Time Badge
- [ ] Shows timestamp with clock icon
- [ ] Format: "Thời gian ký: DD/MM/YYYY - HH:MM"

#### Info Grid (2 columns)
- [ ] **Left Column** - Document Info:
  - Tên tài liệu
  - File gốc (with code style)
  - Blue gradient background
- [ ] **Right Column** - Signer Info:
  - Họ và tên
  - Email
  - Vai trò badge
  - Green gradient background

#### Next Steps Section
- [ ] Blue gradient background
- [ ] 3 checkmarks with text:
  - Email xác nhận sẽ được gửi
  - Tài liệu đã ký kèm theo
  - Có thể đóng cửa sổ này

#### Action Buttons
- [ ] **Print Button** (left):
  - Icon: 🖨️
  - Text: "In trang này"
  - Outline style
  - Click → Opens print dialog
- [ ] **Close Button** (right):
  - Icon: ✓
  - Text: "Đóng cửa sổ"
  - Gradient style (green to blue)
  - Click → Closes window

---

## 🎨 Visual Checks

### Sidebar
- [ ] Fixed width: 320px
- [ ] Full height: 100vh
- [ ] Scrollable if content overflows
- [ ] White background
- [ ] Border on right side
- [ ] Sections separated by borders

### Thank You Page
- [ ] Centered on screen
- [ ] Max width: ~1024px
- [ ] Gradient background (green/blue/purple)
- [ ] White card with rounded corners
- [ ] Shadow effect
- [ ] Responsive on mobile

### Colors
- [ ] Green: Success states
- [ ] Blue: Info/primary actions
- [ ] Yellow: Pending states
- [ ] Red: Rejected/error states
- [ ] Gray: Neutral/disabled

---

## 📱 Responsive Test (Optional)

### Desktop (1920x1080)
- [ ] Sidebar: 320px fixed
- [ ] Main content: Remaining space
- [ ] All text readable
- [ ] No horizontal scroll

### Tablet (768px)
- [ ] Sidebar: Still visible
- [ ] Main content: Adjusted
- [ ] Touch-friendly buttons

### Mobile (375px)
- [ ] Sidebar: Hidden or overlay?
- [ ] Main content: Full width
- [ ] Buttons: Full width
- [ ] Text: Readable size

---

## 🐛 Bug Tracking

| # | Issue | Severity | Screenshot |
|---|-------|----------|------------|
| 1 |       |          |            |
| 2 |       |          |            |
| 3 |       |          |            |

---

## 📸 Screenshots to Take

1. **Initial page** (before OTP)
2. **After OTP** (sidebar visible)
3. **Sidebar close-up** (all sections)
4. **Guided mode** (with progress)
5. **Thank you page** (full view)
6. **Thank you page** (info grid close-up)

---

## ✅ Success Criteria

- [x] Sidebar appears after OTP verification
- [x] Sidebar shows all required info
- [x] Signers list with correct status
- [x] Activity history visible
- [x] Progress bar updates
- [x] Thank you page appears after signing
- [x] Thank you page has all sections
- [x] Print button works
- [x] Close button works
- [x] No console errors
- [x] No visual glitches

---

## 🚀 Quick Commands

### Get Fresh OTP (if expired)
```bash
cd backend
node scripts/quick-test-guided.js
```

### Check Backend Logs
```bash
# In Kiro IDE
getProcessOutput processId:5
```

### Check Frontend Logs
```bash
# In Kiro IDE
getProcessOutput processId:7
```

---

## 💡 Tips

1. **Open DevTools** (F12) to check console
2. **Take screenshots** of each step
3. **Note any bugs** immediately
4. **Test on different browsers** (Chrome, Firefox, Edge)
5. **Try different screen sizes**
6. **Check mobile view** (DevTools device mode)

---

**Ready to test!** 🎯

Open the URL and follow the checklist step by step.

**Time Limit**: OTP expires in 10 minutes (1:54 AM)

**Current Time**: Check your clock!

---

## 📞 Need Help?

If something doesn't work:
1. Check browser console for errors
2. Check backend logs: `getProcessOutput processId:5`
3. Check frontend logs: `getProcessOutput processId:7`
4. Get fresh OTP: `node scripts/quick-test-guided.js`
5. Report back with error message

---

**Happy Testing!** 🚀
