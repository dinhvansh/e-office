# ✅ Test Checklist: Drag & Drop Reorder Signers

**Date**: 2025-11-27  
**Feature**: Drag & Drop Reorder with Role Selection  
**Status**: ✅ Bug Fixed - Ready for Testing

---

## 🐛 Bug Fixed

**Issue**: React hook usage error
```typescript
// ❌ WRONG
useState(() => { setLocalSigners(signers); });

// ✅ FIXED
React.useEffect(() => { setLocalSigners(signers); }, [signers]);
```

**Result**: Drag & drop and role selector should now work correctly!

---

## 🧪 Test Steps

### Step 1: Refresh Browser
```
1. Hard refresh: Ctrl + Shift + R (Windows) or Cmd + Shift + R (Mac)
2. Clear cache if needed
3. Reload page
```

### Step 2: Open Dialog
```
1. Go to: Sign Requests → Click any draft request
2. Click "Quản lý người ký" button
3. Dialog should open
```

### Step 3: Test Drag & Drop
```
✅ Check: Do you see drag handle icon (⋮⋮) on left side?
✅ Check: Does cursor change to "move" when hovering?
✅ Check: Can you drag signers up/down?
✅ Check: Do order badges (1, 2, 3...) update in real-time?
✅ Check: Does toast show "✅ Đã cập nhật thứ tự ký" after drop?
```

### Step 4: Test Role Selection
```
✅ Check: Do you see dropdown below each signer's email?
✅ Check: Does dropdown have 2 options?
   - 👤 Người ký
   - ✅ Người phê duyệt
✅ Check: Can you change role?
✅ Check: Does toast show "✅ Đã cập nhật vai trò"?
```

### Step 5: Test Add New Signer
```
✅ Check: Do you see 3 input fields?
   - Email
   - Họ tên
   - Vai trò (dropdown)
✅ Check: Can you select role before adding?
✅ Check: Does new signer appear with correct role?
```

### Step 6: Test Validation
```
✅ Check: Can you only drag when status = draft?
✅ Check: Does drag handle disappear for sent documents?
✅ Check: Does backend reject reorder for non-draft?
```

---

## ❌ If Not Working

### Issue 1: Drag & Drop Not Working
**Possible Causes**:
- `allowReorder` prop not passed as `true`
- Document status not `draft`
- Browser cache issue

**Solutions**:
```typescript
// Check in editor page:
<ManageSignersDialog
  allowReorder={isDraft && allowWorkflowOverride} // ✅ Must be true
  ...
/>
```

### Issue 2: Role Selector Not Visible
**Possible Causes**:
- Component not re-rendered after fix
- Browser cache

**Solutions**:
1. Hard refresh: `Ctrl + Shift + R`
2. Clear browser cache
3. Restart frontend server

### Issue 3: Changes Not Persisting
**Possible Causes**:
- Backend API error
- Network issue

**Solutions**:
1. Check browser console for errors
2. Check backend console for errors
3. Verify backend server is running
4. Test backend API directly:
```bash
node backend/scripts/test-drag-drop-reorder.js
```

---

## 🔧 Debug Commands

### Check Backend API
```bash
cd backend
node scripts/test-drag-drop-reorder.js
```

### Check Frontend Console
```
F12 → Console tab
Look for errors or warnings
```

### Check Network Tab
```
F12 → Network tab
Filter: XHR
Look for: PUT /sign-requests/:id/signers/reorder
Status should be: 200 OK
```

---

## ✅ Expected Results

### Drag & Drop
- ✅ Drag handle visible (⋮⋮ icon)
- ✅ Cursor changes to move
- ✅ Smooth drag animation
- ✅ Order updates in real-time
- ✅ Toast notification on success
- ✅ Changes persist after refresh

### Role Selection
- ✅ Dropdown visible below email
- ✅ 2 options available
- ✅ Can change role
- ✅ Toast notification on success
- ✅ Role persists after refresh

### Add New Signer
- ✅ 3 input fields visible
- ✅ Role dropdown in add form
- ✅ Can select role before adding
- ✅ New signer has correct role

---

## 📊 Success Criteria

- [ ] Drag & drop working smoothly
- [ ] Role selector visible and functional
- [ ] Add new signer with role selection
- [ ] Changes persist after refresh
- [ ] Validation working (draft only)
- [ ] No console errors
- [ ] Backend API responding correctly

**Status**: ⏳ Pending User Testing

---

## 🎯 Next Steps After Testing

### If All Tests Pass ✅
1. Mark feature as complete
2. Deploy to staging
3. User acceptance testing

### If Tests Fail ❌
1. Document exact error
2. Check browser console
3. Check backend logs
4. Report to developer with:
   - Screenshot
   - Console errors
   - Steps to reproduce

---

**Last Updated**: 2025-11-27  
**Bug Fix Applied**: ✅ React hook usage corrected  
**Ready for Testing**: ✅ Yes
