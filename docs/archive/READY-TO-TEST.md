# 🎯 Ready to Test: Guided Signing Flow

## ✅ Setup Complete!

All servers are running and test data is ready. You can now test the Guided Signing Flow manually.

---

## 🚀 Quick Start

### 1. Open Test URL
```
http://localhost:3000/sign/7b627ea3f971f174f6dd7f3f3d5fd709372cf42b337779bcf77ed3b9196b9d0d
```

### 2. Login Credentials
- **Email**: `dir.it@acme.local`
- **OTP**: `318139`

### 3. Follow Test Checklist
Open `TEST-GUIDED-SIGNING-MANUAL.md` and follow the step-by-step checklist.

---

## 📋 Test Checklist Summary

1. ✅ Open signing page
2. ✅ Enter email and get OTP
3. ✅ Verify OTP
4. ✅ Click "Bắt đầu" to start guided mode
5. ✅ Sign each field in sequence
6. ✅ Verify progress updates
7. ✅ Submit signatures

---

## 🔧 Server Status

| Service | Status | URL |
|---------|--------|-----|
| Backend | ✅ Running | http://localhost:4000 |
| Frontend | ✅ Running | http://localhost:3000 |
| License Server | ✅ Running | http://localhost:5000 |

---

## 🎯 What to Test

### Core Functionality
- [ ] Email verification works
- [ ] OTP verification works
- [ ] PDF loads correctly
- [ ] Fields are visible
- [ ] Guided mode starts
- [ ] Progress tracking works
- [ ] Auto-scroll works
- [ ] Field highlighting works
- [ ] Signature canvas works
- [ ] Completion detection works
- [ ] Submit works

### UI/UX
- [ ] Animations are smooth
- [ ] Progress bar updates
- [ ] Toast notifications appear
- [ ] Colors are correct
- [ ] Text is readable
- [ ] Buttons are clickable
- [ ] Layout is responsive

### Edge Cases
- [ ] What if user skips guided mode?
- [ ] What if user refreshes page?
- [ ] What if OTP expires?
- [ ] What if network fails?
- [ ] What if PDF is large?

---

## 🐛 Bug Reporting

If you find bugs, document them in `TEST-GUIDED-SIGNING-MANUAL.md`:

```markdown
| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Progress bar not updating | High | Open |
| 2 | Auto-scroll too fast | Medium | Open |
```

---

## 🔄 Get Fresh OTP

If OTP expires (10 minutes), run:

```bash
cd backend
node scripts/quick-test-guided.js
```

This will generate a new OTP and show the test URL.

---

## 📱 Mobile Testing

After desktop testing, test on mobile:

1. Open Chrome DevTools
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select mobile device (iPhone 12, Galaxy S20, etc.)
4. Repeat test checklist
5. Test touch gestures

---

## 💡 Tips

1. **Keep console open** - Watch for errors
2. **Check Network tab** - Verify API calls
3. **Test slowly** - Don't rush through steps
4. **Take screenshots** - Document issues
5. **Note timing** - Is anything too slow/fast?

---

## 📞 Need Help?

### Check Logs
```bash
# Backend logs
getProcessOutput processId:5

# Frontend logs
getProcessOutput processId:7
```

### Common Issues

**OTP not working?**
- Check if OTP expired (10 min limit)
- Run `quick-test-guided.js` for fresh OTP

**PDF not loading?**
- Check backend logs for errors
- Verify file exists in storage

**Fields not showing?**
- Check sign request has fields
- Run `check-sign-requests-status.js`

**Guided mode not starting?**
- Check console for JavaScript errors
- Verify `guidedMode` state is true

---

## ✅ Success Criteria

Test is successful if:
- ✅ All 7 steps complete without errors
- ✅ Progress tracking works correctly
- ✅ Auto-scroll is smooth
- ✅ Signatures are saved
- ✅ Thank you page appears
- ✅ No console errors
- ✅ Mobile responsive

---

## 🎊 After Testing

Once testing is complete:

1. **Document findings** in test checklist
2. **List bugs** with severity
3. **Suggest improvements**
4. **Report back** for fixes

Then we can:
- Fix bugs found
- Improve UX based on feedback
- Add keyboard navigation
- Optimize for mobile
- Move to next feature

---

**Happy Testing!** 🚀

Open the URL and start testing. Follow the checklist step by step.
