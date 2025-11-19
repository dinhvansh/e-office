# Phase 1 - UI Testing Checklist

**Date**: 2025-11-19  
**Tester**: _____________

---

## 🔐 Login

**URL**: http://localhost:3000

- [ ] Login page hiển thị đúng
- [ ] Login với: `admin@acme.local / secret123`
- [ ] Redirect về dashboard thành công
- [ ] Không có lỗi token

---

## 📄 Document Types

**URL**: http://localhost:3000/document-types

### View
- [ ] Trang load thành công
- [ ] Hiển thị 8 loại văn bản:
  - [ ] Công văn đi
  - [ ] Công văn đến
  - [ ] Quyết định
  - [ ] Thông báo
  - [ ] Báo cáo
  - [ ] Hợp đồng
  - [ ] Biên bản
  - [ ] Tờ trình
- [ ] Stats cards hiển thị đúng
- [ ] Grid view hiển thị đầy đủ thông tin

### Create
- [ ] Click "Thêm loại văn bản"
- [ ] Modal mở ra
- [ ] Điền form:
  - Mã: `TEST`
  - Tên: `Văn bản test`
  - Mô tả: `Test document type`
  - Category: `administrative`
  - Bật auto-numbering
  - Bật digital signing
- [ ] Click "Tạo mới"
- [ ] Document type mới xuất hiện trong danh sách

### Edit
- [ ] Click icon Edit trên 1 document type
- [ ] Modal mở với data đã điền
- [ ] Sửa tên thành "Văn bản test (Updated)"
- [ ] Click "Cập nhật"
- [ ] Tên đã được cập nhật

### Delete
- [ ] Click icon Delete trên document type vừa tạo
- [ ] Confirm dialog xuất hiện
- [ ] Click OK
- [ ] Document type bị xóa khỏi danh sách

---

## 🏢 External Organizations

**URL**: http://localhost:3000/external-orgs

### View
- [ ] Trang load thành công
- [ ] Hiển thị 5+ organizations
- [ ] Stats cards hiển thị đúng (4 categories)
- [ ] Table hiển thị:
  - [ ] Tên tổ chức
  - [ ] Mã
  - [ ] Category badge (màu sắc đúng)
  - [ ] Contact info (người, phone, email)

### Create
- [ ] Click "Thêm tổ chức"
- [ ] Modal mở ra
- [ ] Điền form:
  - Tên: `Công ty Test`
  - Mã: `TEST`
  - Loại: `supplier`
  - Địa chỉ: `123 Test Street`
  - Phone: `0123456789`
  - Email: `test@test.com`
  - Người liên hệ: `Nguyễn Test`
- [ ] Click "Tạo mới"
- [ ] Organization mới xuất hiện

### Edit
- [ ] Click Edit trên organization vừa tạo
- [ ] Modal mở với data
- [ ] Sửa tên thành "Công ty Test (Updated)"
- [ ] Click "Cập nhật"
- [ ] Tên đã được cập nhật

### Delete
- [ ] Click Delete
- [ ] Confirm
- [ ] Organization bị xóa

---

## 📁 Documents

**URL**: http://localhost:3000/documents

### View
- [ ] Trang load thành công
- [ ] Hiển thị danh sách documents
- [ ] Cột "Số văn bản" hiển thị (VD: 001/2025)
- [ ] Cột "Loại văn bản" hiển thị

### Upload with Document Type
- [ ] Click "Upload Document"
- [ ] Modal mở ra
- [ ] Dropdown "Loại văn bản" hiển thị
- [ ] Chọn loại: "Công văn đi"
- [ ] Chọn file PDF
- [ ] Click "Upload"
- [ ] Document mới xuất hiện với:
  - [ ] Số văn bản tự động (VD: 001/2025)
  - [ ] Loại văn bản: "Công văn đi"

### Upload Another Document
- [ ] Upload thêm 1 document với cùng loại
- [ ] Số văn bản tăng lên (VD: 002/2025)

---

## 🏷️ Document Tags (Backend Only - No UI Yet)

**Test via**: Browser DevTools Console

### Test in Console
```javascript
// Get auth token from localStorage
const auth = JSON.parse(localStorage.getItem('esign.auth'));
const token = auth.tokens.accessToken;

// Add tag
fetch('http://localhost:4000/api/v1/documents/1/tags', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ tag: 'urgent' })
}).then(r => r.json()).then(console.log);

// Get tags
fetch('http://localhost:4000/api/v1/documents/1/tags', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.log);

// Get all tags
fetch('http://localhost:4000/api/v1/documents/tags/all', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.log);
```

**Expected Results**:
- [ ] Add tag returns: `{ success: true, data: { tags: ['urgent'] } }`
- [ ] Get tags returns list of tags
- [ ] Get all tags returns all unique tags

---

## 🔐 Document Permissions (Backend Only - No UI Yet)

**Test via**: Browser DevTools Console

```javascript
const auth = JSON.parse(localStorage.getItem('esign.auth'));
const token = auth.tokens.accessToken;

// Grant permission
fetch('http://localhost:4000/api/v1/documents/1/permissions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    subject_type: 'user',
    subject_id: 1,
    can_read: true,
    can_edit: true
  })
}).then(r => r.json()).then(console.log);

// Get permissions
fetch('http://localhost:4000/api/v1/documents/1/permissions', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.log);
```

**Expected Results**:
- [ ] Grant permission returns permission object
- [ ] Get permissions returns list of permissions

---

## 📚 Document Versions (Backend Only - No UI Yet)

**Test via**: Browser DevTools Console

```javascript
const auth = JSON.parse(localStorage.getItem('esign.auth'));
const token = auth.tokens.accessToken;

// Create version
fetch('http://localhost:4000/api/v1/documents/1/versions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    file_path: '/storage/test-v1.pdf',
    comment: 'Test version'
  })
}).then(r => r.json()).then(console.log);

// Get versions
fetch('http://localhost:4000/api/v1/documents/1/versions', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.log);

// Get latest
fetch('http://localhost:4000/api/v1/documents/1/versions/latest', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.log);
```

**Expected Results**:
- [ ] Create version returns version object with `version_no: 1`
- [ ] Get versions returns array of versions
- [ ] Get latest returns latest version

---

## 👥 Users, Departments, Roles

### Users
**URL**: http://localhost:3000/users
- [ ] Trang load thành công
- [ ] Hiển thị danh sách users
- [ ] CRUD operations work

### Departments
**URL**: http://localhost:3000/departments
- [ ] Trang load thành công
- [ ] Hiển thị tree view
- [ ] CRUD operations work

### Roles
**URL**: http://localhost:3000/roles
- [ ] Trang load thành công
- [ ] Hiển thị roles với permissions
- [ ] CRUD operations work

---

## 🔄 Navigation & General

- [ ] Sidebar navigation hiển thị đầy đủ
- [ ] Click vào từng menu item → page load đúng
- [ ] Không có lỗi console
- [ ] Không có lỗi token
- [ ] Logout → Login lại hoạt động bình thường

---

## 📊 Test Summary

**Total Tests**: _____ / _____  
**Passed**: _____  
**Failed**: _____  

**Issues Found**:
1. _______________________________
2. _______________________________
3. _______________________________

**Notes**:
_______________________________
_______________________________
_______________________________

---

## ✅ Sign-off

**Tester**: _____________  
**Date**: _____________  
**Status**: [ ] PASS  [ ] FAIL  

---

## 📝 Notes for Future UI Development

**Tags, Permissions, Versions** hiện chỉ có backend API. Cần develop UI:

### Document Tags UI (Future)
- Tag input field on document detail page
- Tag chips display
- Filter documents by tag
- Tag autocomplete

### Document Permissions UI (Future)
- Permissions modal on document detail
- User/Role/Department selector
- Permission checkboxes (Read, Edit, Approve, Share, Delete)
- Permissions list view

### Document Versions UI (Future)
- Versions tab on document detail
- Upload new version button
- Version history list
- Compare versions
- Restore version

**Priority**: Medium (Phase 2 or 3)
