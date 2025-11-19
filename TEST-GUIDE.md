# 🧪 E-Office Testing Guide

## 🔐 Login Credentials
```
Email: admin@acme.local
Password: secret123
```

## 📋 Checklist - Các chức năng cần test

### ✅ Phase 0: E-Signature Base (DONE)

#### 1. Authentication & Authorization
- [ ] **Login/Logout**
  - Login với credentials đúng
  - Login với credentials sai (phải báo lỗi)
  - Logout và login lại
  - Token tự động refresh sau 1 giờ

- [ ] **Multi-tenant**
  - Xem thông tin tenant (Dashboard → Tenant: Acme Corp)
  - Mỗi user chỉ thấy data của tenant mình

#### 2. Document Management
- [ ] **Upload Document**
  - Vào `/documents`
  - Click "Upload Document"
  - Chọn file PDF/DOCX
  - Chọn Document Type (bắt buộc)
  - Upload thành công
  - Kiểm tra "Số văn bản" tự động generate (VD: 001/2025)

- [ ] **View Documents**
  - Xem danh sách documents
  - Xem chi tiết document
  - Download document
  - Kiểm tra cột "Số văn bản" hiển thị đúng

- [ ] **Document Status**
  - Draft
  - Pending
  - Approved
  - Rejected

#### 3. Sign Requests
- [ ] **Create Sign Request**
  - Vào `/sign-requests`
  - Click "Create Sign Request"
  - Chọn document
  - Thêm signers (email, name, role)
  - Set deadline
  - Gửi request

- [ ] **View Sign Requests**
  - Xem danh sách sign requests
  - Xem chi tiết request
  - Xem danh sách signers
  - Xem status của từng signer

- [ ] **Sign Document (OTP Flow)**
  - Signer nhận email với OTP
  - Nhập OTP để verify
  - Sign document
  - Status chuyển sang "Signed"

#### 4. Webhooks
- [ ] **Webhook Management**
  - Vào `/webhooks`
  - Tạo webhook mới
  - Test webhook
  - Xem webhook logs

### ✅ Phase 1: Foundation Enhancement (DONE)

#### 5. Document Types
- [ ] **View Document Types**
  - Vào `/document-types`
  - Xem danh sách 8 loại văn bản:
    - Công văn đi
    - Công văn đến
    - Quyết định
    - Thông báo
    - Báo cáo
    - Hợp đồng
    - Biên bản
    - Tờ trình

- [ ] **Document Type Details**
  - Xem code, name, description
  - Xem category (administrative/legal/financial/hr)
  - Xem require_numbering (có/không)
  - Xem require_digital_signing (có/không)
  - Xem số lượng documents đã dùng type này

- [ ] **Create Document Type**
  - Click "Thêm loại văn bản"
  - Điền thông tin
  - Chọn category
  - Bật/tắt auto-numbering
  - Bật/tắt digital signing
  - Lưu thành công

- [ ] **Edit/Delete Document Type**
  - Edit thông tin
  - Delete (nếu chưa có document nào dùng)

#### 6. Auto-Numbering System
- [ ] **Numbering Rules**
  - Xem numbering rules của từng document type
  - Pattern: {AUTO}/{YEAR}/{MONTH}/{DEPT}/{TYPE}
  - Last number tracking
  - Yearly reset

- [ ] **Test Auto-Numbering**
  - Upload document với type "Công văn đi"
  - Kiểm tra số văn bản: 001/2025
  - Upload thêm 1 document nữa
  - Kiểm tra số văn bản: 002/2025
  - Số tự động tăng

- [ ] **Preview Numbering**
  - Xem preview số văn bản trước khi tạo
  - Format đúng theo pattern

#### 7. Document Upload với Type
- [ ] **Upload Flow**
  - Dropdown "Loại văn bản" hiển thị
  - Chọn loại văn bản (required)
  - Upload file
  - Số văn bản tự động generate
  - Hiển thị trong danh sách documents

- [ ] **Backward Compatibility**
  - Documents cũ (không có type) vẫn hiển thị
  - Không bị lỗi khi xem documents cũ

### 🔄 Phase 2-7: Coming Soon

#### 8. RBAC (Role-Based Access Control)
- [ ] **Users Management** (`/users`)
- [ ] **Departments** (`/departments`)
- [ ] **Roles & Permissions** (`/roles`)

#### 9. Workflow Engine (Phase 2)
- [ ] Workflow templates
- [ ] Multi-step approval
- [ ] Deadline tracking

#### 10. Incoming/Outgoing Documents (Phase 3)
- [ ] External organizations
- [ ] Document registration
- [ ] Contract management

## 🧪 Test Scenarios

### Scenario 1: Complete Document Flow
1. Login
2. Upload document với type "Công văn đi"
3. Kiểm tra số văn bản: 001/2025
4. Tạo sign request cho document đó
5. Thêm 2 signers
6. Gửi request
7. Verify OTP và sign
8. Kiểm tra status = "Signed"

### Scenario 2: Document Types Management
1. Vào `/document-types`
2. Tạo document type mới: "Giấy mời họp"
3. Set category = "administrative"
4. Bật auto-numbering
5. Upload document với type mới
6. Kiểm tra số văn bản tự động

### Scenario 3: Multi-Document Upload
1. Upload 5 documents với type "Công văn đi"
2. Kiểm tra số văn bản: 001/2025, 002/2025, ..., 005/2025
3. Upload 3 documents với type "Quyết định"
4. Kiểm tra số văn bản: 001/2025, 002/2025, 003/2025
5. Mỗi type có numbering riêng

### Scenario 4: Token & Auth
1. Login
2. Đợi 1 giờ (hoặc thay đổi TOKEN_EXPIRES_IN=1m để test nhanh)
3. Click vào page khác
4. Token tự động refresh
5. Không bị logout

### Scenario 5: Error Handling
1. Logout
2. Thử truy cập `/documents` trực tiếp
3. Phải redirect về `/login`
4. Login lại
5. Redirect về page đã request

## 🐛 Known Issues & Fixes

### Issue 1: Invalid Token
**Triệu chứng**: Lỗi "Invalid token" khi click vào page
**Nguyên nhân**: Token cũ trong localStorage
**Fix**: Clear localStorage hoặc dùng Incognito mode

### Issue 2: Backend Crash
**Triệu chứng**: Backend không response sau vài lần lỗi token
**Fix**: Đã fix với try-catch trong auth middleware

### Issue 3: Document Types Page Error
**Triệu chứng**: Lỗi token khi vào `/document-types`
**Fix**: Đã fix - dùng `useAuth().fetchJson` thay vì `localStorage.getItem('token')`

## 📊 Test Results Template

```
Date: ___________
Tester: ___________

✅ = Pass
❌ = Fail
⚠️ = Partial

[ ] Login/Logout
[ ] Upload Document
[ ] Document Types
[ ] Auto-Numbering
[ ] Sign Requests
[ ] Webhooks
[ ] Token Refresh

Notes:
_______________________
_______________________
```

## 🚀 Quick Test Commands

### Backend API Test
```powershell
# Test login
$body = '{"email":"admin@acme.local","password":"secret123"}'
$response = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/auth/login" -Method POST -Body $body -ContentType "application/json"
$token = $response.data.tokens.accessToken

# Test documents
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:4000/api/v1/documents" -Headers $headers

# Test document types
Invoke-RestMethod -Uri "http://localhost:4000/api/v1/document-types" -Headers $headers
```

### Frontend E2E Test
```bash
cd frontend
npx playwright test --headed
```

### Clear Storage (if needed)
```bash
cd frontend
npx playwright test clear-storage-only.spec.ts --headed
```

## 📝 Bug Report Template

```
Title: [Brief description]

Steps to Reproduce:
1. 
2. 
3. 

Expected Result:


Actual Result:


Screenshots:


Environment:
- Browser: 
- OS: 
- Date: 
```

---

**Happy Testing! 🎉**
