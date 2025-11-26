# 📋 Kế Hoạch Test - Tối 26/11/2025

**Thời gian dự kiến**: 2-3 giờ  
**Mục tiêu**: Kiểm tra toàn bộ hệ thống trước khi deploy production

---

## 🎯 Test Accounts

```
Admin: admin@acme.local / password123
Creator: creator@acme.local / password123
Approver: approver@acme.local / password123
External: vanqn95@gmail.com (email thật)
```

---

## ✅ Test Checklist

### **Phase 1: Basic Features** (30 mins)

#### 1.1 Login & Authentication (5 mins)
- [ ] Login với admin account
- [ ] Logout và login lại
- [ ] Check menu permissions (admin thấy full menu)
- [ ] Check loading bar khi chuyển trang
- [ ] Verify logo hiển thị đúng

#### 1.2 Document Management (10 mins)
- [ ] Upload document mới
- [ ] Chọn document type (Hợp đồng)
- [ ] Check auto-numbering (001/2025)
- [ ] View document (PDF hiển thị)
- [ ] Download document
- [ ] Search document
- [ ] Filter by document type

#### 1.3 User Management (5 mins)
- [ ] Create new user
- [ ] Assign role (Manager)
- [ ] Edit user info
- [ ] Check user list pagination
- [ ] Search user by name/email

#### 1.4 Workflow Management (10 mins)
- [ ] View workflows list
- [ ] Check workflow steps
- [ ] Verify approver info hiển thị
- [ ] Check workflow preview

---

### **Phase 2: Approval Workflow** (45 mins)

#### 2.1 Create Document with Approval (15 mins)
- [ ] Login as **creator@acme.local**
- [ ] Upload document (Hợp đồng)
- [ ] Add internal signers:
  - [ ] admin@acme.local (Order: 1)
  - [ ] approver@acme.local (Order: 2)
- [ ] Add signature fields (2 fields)
- [ ] Submit for approval (HOPDONG workflow)
- [ ] Check status: "pending_approval"
- [ ] Check "Công việc của tôi" - không có task (creator không phải approver)

#### 2.2 First Approval (Manager) (10 mins)
- [ ] Login as **approver@acme.local**
- [ ] Go to "Công việc của tôi"
- [ ] Check metric cards (1 pending approval)
- [ ] Click "Phê duyệt" button
- [ ] View document PDF
- [ ] Add signature (draw/upload/type)
- [ ] Add comment (optional)
- [ ] Click "Phê duyệt"
- [ ] Check success message
- [ ] Verify back to My Tasks page

#### 2.3 Second Approval (HR) (10 mins)
- [ ] Login as **admin@acme.local**
- [ ] Go to "Công việc của tôi"
- [ ] Check metric cards (1 pending approval)
- [ ] Click "Phê duyệt" button
- [ ] View document
- [ ] Approve with signature
- [ ] Check workflow completed
- [ ] Verify document status: "approved"

#### 2.4 Verify Approval History (10 mins)
- [ ] Login as **creator@acme.local**
- [ ] View document detail
- [ ] Check approval history
- [ ] Verify 2 approvals completed
- [ ] Check signatures saved

---

### **Phase 3: Internal Signing** (30 mins)

#### 3.1 First Signer (Admin) (15 mins)
- [ ] Login as **admin@acme.local**
- [ ] Go to "Công việc của tôi"
- [ ] Check metric cards (1 signing task)
- [ ] Filter by "Ký tài liệu"
- [ ] Click "Ký ngay" button (green)
- [ ] View document with signature fields
- [ ] Draw signature on canvas
- [ ] Click "Lưu chữ ký"
- [ ] Check success message
- [ ] Verify progress: 1/2 (50%)

#### 3.2 Second Signer (Approver) (15 mins)
- [ ] Login as **approver@acme.local**
- [ ] Go to "Công việc của tôi"
- [ ] Check signing task appears
- [ ] Click "Ký ngay"
- [ ] Sign document
- [ ] Check progress: 2/2 (100%)
- [ ] Verify status: "completed"
- [ ] Download signed PDF
- [ ] Check signatures embedded in PDF

---

### **Phase 4: External Signing** (30 mins)

#### 4.1 Create Document with External Signer (10 mins)
- [ ] Login as **creator@acme.local**
- [ ] Upload new document
- [ ] Add external signer: vanqn95@gmail.com
- [ ] Add signature fields
- [ ] Send sign request
- [ ] Check email sent (backend logs)

#### 4.2 External Signer Flow (20 mins)
- [ ] Check email inbox (vanqn95@gmail.com)
- [ ] Verify email contains:
  - [ ] Signing URL
  - [ ] OTP code (6 digits)
- [ ] Click signing URL
- [ ] Enter email: vanqn95@gmail.com
- [ ] Enter OTP from email
- [ ] Click "Xác thực OTP"
- [ ] Check sidebar appears (right side)
- [ ] Click "Bắt đầu" (guided mode)
- [ ] Sign all fields
- [ ] Submit signature
- [ ] Check thank you page
- [ ] Download signed PDF

---

### **Phase 5: Combined Tasks Page** (15 mins)

#### 5.1 My Tasks Overview (10 mins)
- [ ] Login as **approver@acme.local**
- [ ] Go to "Công việc của tôi"
- [ ] Check metric cards:
  - [ ] Total tasks
  - [ ] Pending approvals
  - [ ] Pending signing
  - [ ] Completed
- [ ] Check filters work:
  - [ ] Task type (All/Approval/Signing)
  - [ ] Document type
  - [ ] Search
  - [ ] Sort
- [ ] Check pagination
- [ ] Check smart buttons:
  - [ ] "Phê duyệt" (blue) for approvals
  - [ ] "Ký ngay" (green) for signing
  - [ ] "Xem" (gray) for completed

#### 5.2 Navigation Flow (5 mins)
- [ ] Click approval task → Detail page
- [ ] Back button → Returns to My Tasks
- [ ] Click signing task → Signing page
- [ ] Success → Returns to My Tasks
- [ ] Check loading bar on navigation

---

### **Phase 6: UI/UX Testing** (15 mins)

#### 6.1 Loading States (5 mins)
- [ ] Check skeleton loading on My Tasks page
- [ ] Check loading bar on page navigation
- [ ] Check button loading states
- [ ] Check toast notifications

#### 6.2 Responsive Design (5 mins)
- [ ] Resize browser window
- [ ] Check mobile view (F12 → Device toolbar)
- [ ] Check tablet view
- [ ] Check sidebar collapse/expand

#### 6.3 Error Handling (5 mins)
- [ ] Try invalid login
- [ ] Try upload without file
- [ ] Try submit without required fields
- [ ] Check error messages (Vietnamese)

---

### **Phase 7: Performance & Security** (15 mins)

#### 7.1 Performance (10 mins)
- [ ] Check page load times (< 2s)
- [ ] Check API response times (< 500ms)
- [ ] Check large file upload (> 5MB)
- [ ] Check pagination with many records

#### 7.2 Security (5 mins)
- [ ] Try access approval without permission
- [ ] Try access other user's document
- [ ] Check token expiration
- [ ] Check OTP expiration (10 mins)

---

## 🐛 Bug Tracking Template

Nếu phát hiện lỗi, ghi lại theo format:

```
**Bug #X: [Tên lỗi ngắn gọn]**

**Severity**: Critical / High / Medium / Low
**Page**: [Tên trang]
**Steps to Reproduce**:
1. ...
2. ...
3. ...

**Expected**: [Kết quả mong đợi]
**Actual**: [Kết quả thực tế]
**Screenshot**: [Nếu có]

**Status**: 🔴 Open / 🟡 In Progress / 🟢 Fixed
```

---

## 📊 Test Results Summary

**Tổng số test cases**: 80+  
**Passed**: ___  
**Failed**: ___  
**Blocked**: ___  
**Pass Rate**: ___%

**Critical Issues**: ___  
**High Priority**: ___  
**Medium Priority**: ___  
**Low Priority**: ___

---

## ✅ Sign-off

- [ ] All critical features tested
- [ ] All bugs documented
- [ ] Performance acceptable
- [ ] Security checks passed
- [ ] Ready for production

**Tested by**: _______________  
**Date**: 26/11/2025  
**Time**: _______________

---

## 🔜 Next Steps

**If all tests pass**:
1. Fix any minor bugs found
2. Deploy to staging environment
3. Final UAT with real users
4. Deploy to production

**If critical bugs found**:
1. Document all issues
2. Prioritize fixes
3. Re-test after fixes
4. Repeat test cycle
