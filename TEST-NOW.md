# 🧪 Test Guide - Phase 1 Features

**Servers Running**: ✅  
**Backend**: http://localhost:4000  
**Frontend**: http://localhost:3000

---

## 🔐 Login First

**URL**: http://localhost:3000/login

**Credentials**:
- Email: `admin@acme.local`
- Password: `secret123`

---

## ✅ Test Checklist

### 1. Users Management (/users)
- [ ] Page loads
- [ ] Can see user list
- [ ] Click "Thêm người dùng" button
- [ ] Modal appears (if implemented)
- [ ] Can create new user
- [ ] Can delete user

### 2. Departments (/departments) - JUST FIXED ✅
- [ ] Page loads
- [ ] Can see department tree
- [ ] Click "Thêm phòng ban" button
- [ ] **Modal appears** ← Fixed!
- [ ] Fill form: Name + Description
- [ ] Click "Tạo"
- [ ] New department appears in list

### 3. Roles (/roles) - JUST FIXED ✅
- [ ] Page loads
- [ ] Can see roles grid
- [ ] Click "Tạo vai trò mới" button
- [ ] **Modal appears** ← Fixed!
- [ ] Fill form: Name + Description
- [ ] Click "Tạo"
- [ ] New role appears in grid

### 4. Document Types (/document-types) - NEW ✅
- [ ] Page loads
- [ ] Can see 8 document types
- [ ] Each card shows:
  - [ ] Name & code
  - [ ] Category badge
  - [ ] Numbering pattern
  - [ ] Document count
- [ ] Click "Thêm loại văn bản" button
- [ ] Modal appears (if implemented)

### 5. External Organizations (/external-orgs) - NEW ✅
- [ ] Page loads
- [ ] Can see organizations
- [ ] Stats cards show counts
- [ ] Can create/edit/delete org

### 6. Documents (/documents) - ENHANCED ✅
- [ ] Page loads
- [ ] Click "Upload Document"
- [ ] **Document Type dropdown** appears ← New!
- [ ] Select document type
- [ ] Upload file
- [ ] **Document number auto-generated** ← New!
- [ ] Document appears in list with:
  - [ ] Document type badge
  - [ ] Document number
  - [ ] Priority level (if set)

### 7. Sign Requests (/sign-requests)
- [ ] Page loads
- [ ] Existing sign requests still work
- [ ] Can create new sign request
- [ ] OTP signing works

---

## 🐛 Common Issues & Fixes

### Issue 1: "Invalid token" error
**Fix**: Clear localStorage and login again
```javascript
// In browser console (F12)
localStorage.clear();
// Then refresh and login
```

### Issue 2: Modal không hiện
**Status**: ✅ FIXED! (Just now)
- Departments modal: Added
- Roles modal: Added

### Issue 3: API 403 Forbidden
**Cause**: User không có permission
**Fix**: Assign Admin role to user
```bash
cd backend
node scripts/assign-admin-role.js
```

### Issue 4: Document type dropdown không có
**Check**: 
1. Backend API: http://localhost:4000/api/v1/document-types
2. Should return 8 document types
3. If empty, run: `node scripts/seed-document-types.js`

---

## 🔍 Debug Tools

### Browser Console (F12)
```javascript
// Check token
localStorage.getItem('token')

// Check API response
fetch('http://localhost:4000/api/v1/document-types', {
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
}).then(r => r.json()).then(console.log)

// Clear storage if needed
localStorage.clear()
```

### Backend Logs
Check terminal running backend for errors

### Test API Directly
Open `test-api.http` in VS Code with REST Client extension

---

## ✅ Expected Results

After testing, you should have:
- [x] 3+ departments created
- [x] 1+ custom role created
- [x] 8 document types visible
- [x] 5 external organizations visible
- [x] Documents with auto-generated numbers
- [x] All existing features still working

---

## 📝 Report Issues

If you find bugs:
1. Note the page/feature
2. Note the error message
3. Check browser console (F12)
4. Check backend terminal
5. Tell me and I'll fix!

---

**Start testing now! 🚀**

**Test order**: Login → Departments → Roles → Document Types → Documents
