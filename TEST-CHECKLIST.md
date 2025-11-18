# ✅ Test Checklist - WP Sign

## 🎯 Mục tiêu
Test toàn bộ chức năng cơ bản của WP Sign để đảm bảo hệ thống hoạt động đúng.

---

## 📋 Pre-requisites

- [ ] PostgreSQL đang chạy
- [ ] Backend server đang chạy (`npm run dev` trong `backend/`)
- [ ] Database đã được seed (`npx prisma db seed`)
- [ ] Có test account: `admin@tenant1.com` / `password123`

---

## 🧪 Test Cases

### 1. Authentication & Authorization

#### 1.1 Login Success
- [ ] POST `/api/v1/auth/login` với credentials đúng
- [ ] Response trả về `accessToken` và `refreshToken`
- [ ] Response có thông tin `user` và `tenant`
- [ ] Status code: 200

#### 1.2 Login Failed
- [ ] POST `/api/v1/auth/login` với password sai
- [ ] Response trả về error "Invalid credentials"
- [ ] Status code: 401

#### 1.3 Token Refresh
- [ ] POST `/api/v1/auth/refresh` với `refreshToken`
- [ ] Response trả về `accessToken` mới
- [ ] Status code: 200

#### 1.4 Protected Endpoint
- [ ] GET `/api/v1/tenants/me` không có token
- [ ] Response trả về error "Unauthorized"
- [ ] Status code: 401

---

### 2. Document Management

#### 2.1 Upload Document
- [ ] POST `/api/v1/documents` với base64 PDF
- [ ] Response trả về document với `id`, `file_path`, `hash`
- [ ] File được lưu trong `backend/storage/`
- [ ] Status code: 201

#### 2.2 List Documents
- [ ] GET `/api/v1/documents`
- [ ] Response trả về array of documents
- [ ] Chỉ thấy documents của tenant hiện tại
- [ ] Status code: 200

#### 2.3 Get Document Detail
- [ ] GET `/api/v1/documents/{id}`
- [ ] Response trả về document detail
- [ ] Status code: 200

#### 2.4 Delete Document
- [ ] DELETE `/api/v1/documents/{id}`
- [ ] Document bị xóa khỏi database
- [ ] Status code: 200

#### 2.5 Multi-tenant Isolation
- [ ] Login as tenant1, upload document
- [ ] Login as tenant2
- [ ] GET `/api/v1/documents/{tenant1_doc_id}`
- [ ] Response: 404 Not Found

---

### 3. Sign Request Workflow

#### 3.1 Create Sign Request
- [ ] POST `/api/v1/sign-requests` với document_id và signers
- [ ] Response trả về sign request với status "draft"
- [ ] Signers được tạo với status "pending"
- [ ] Status code: 201

#### 3.2 Get Sign Request
- [ ] GET `/api/v1/sign-requests/{id}`
- [ ] Response có đầy đủ thông tin: document, signers, status
- [ ] Status code: 200

#### 3.3 Cancel Sign Request
- [ ] POST `/api/v1/sign-requests/{id}/cancel`
- [ ] Status chuyển thành "cancelled"
- [ ] Webhook "sign.declined" được trigger
- [ ] Status code: 200

---

### 4. OTP & Signing

#### 4.1 Send OTP
- [ ] POST `/api/v1/signers/{id}/send-otp`
- [ ] Response trả về OTP (6 digits)
- [ ] Signer status chuyển thành "otp_sent"
- [ ] **Dev mode**: OTP hiện trong console log
- [ ] **Prod mode**: Email được gửi đến signer
- [ ] Status code: 200

#### 4.2 Sign with Valid OTP
- [ ] POST `/api/v1/signers/{id}/sign` với OTP đúng
- [ ] Signer status chuyển thành "completed"
- [ ] `signed_at` timestamp được set
- [ ] Sign request status update (in_progress hoặc completed)
- [ ] Webhook "sign.completed" được trigger
- [ ] Status code: 200

#### 4.3 Sign with Invalid OTP
- [ ] POST `/api/v1/signers/{id}/sign` với OTP sai
- [ ] Response: "Invalid OTP"
- [ ] Status code: 400

#### 4.4 Sign with Expired OTP
- [ ] Send OTP
- [ ] Đợi > 10 phút (hoặc modify database)
- [ ] POST `/api/v1/signers/{id}/sign`
- [ ] Response: "OTP expired"
- [ ] Status code: 400

#### 4.5 Sign without OTP
- [ ] POST `/api/v1/signers/{id}/sign` mà chưa send OTP
- [ ] Response: "OTP not issued"
- [ ] Status code: 400

---

### 5. Multiple Signers (Sequential)

#### 5.1 Create Request with 2 Signers
- [ ] POST `/api/v1/sign-requests` với 2 signers
- [ ] Both signers có status "pending"
- [ ] Sign request status: "draft"

#### 5.2 First Signer Signs
- [ ] Signer 1: Send OTP → Sign
- [ ] Signer 1 status: "completed"
- [ ] Sign request status: "in_progress"
- [ ] Signer 2 vẫn "pending"

#### 5.3 Second Signer Signs
- [ ] Signer 2: Send OTP → Sign
- [ ] Signer 2 status: "completed"
- [ ] Sign request status: "completed"
- [ ] Document status: "completed"

---

### 6. Email Service

#### 6.1 Dev Mode (Console Log)
- [ ] Không set `SMTP_USER` trong .env
- [ ] Send OTP
- [ ] Console log hiển thị: `📧 [EMAIL] Would send email:`
- [ ] Log có đầy đủ: to, subject, html

#### 6.2 Production Mode (Real Email)
- [ ] Set SMTP config trong .env
- [ ] Send OTP
- [ ] Email được gửi đến inbox
- [ ] Email có subject: "Mã OTP ký tài liệu - ..."
- [ ] Email có OTP 6 số
- [ ] Email có thời gian hết hạn (10 phút)

#### 6.3 Email Template
- [ ] Email có HTML formatting đẹp
- [ ] Email có logo/branding
- [ ] Email có warning về bảo mật
- [ ] Email có tiếng Việt

---

### 7. Audit Logs

#### 7.1 Get Audit Logs
- [ ] GET `/api/v1/audit/{document_id}`
- [ ] Response trả về array of audit logs
- [ ] Có log cho: document.uploaded, sign.started, sign.completed
- [ ] Mỗi log có: event, created_at, user_id, ip, ua
- [ ] Status code: 200

#### 7.2 Audit Events
- [ ] Upload document → "document.uploaded"
- [ ] Create sign request → "sign.started"
- [ ] Sign document → "sign.completed"
- [ ] Cancel sign request → "sign.cancelled"
- [ ] Delete document → "document.deleted"

---

### 8. Webhooks

#### 8.1 Register Webhook
- [ ] POST `/api/v1/webhooks/register`
- [ ] Webhook được lưu trong memory
- [ ] Status code: 200

#### 8.2 Webhook Delivery
- [ ] Trigger event (e.g., sign.completed)
- [ ] Webhook được gọi với POST request
- [ ] Body có: event, payload, emitted_at
- [ ] Headers có: X-Esign-Event, X-Esign-Signature

#### 8.3 Webhook Events
- [ ] document.uploaded
- [ ] sign.started
- [ ] sign.completed
- [ ] sign.declined

---

### 9. License Guard (On-Premise)

#### 9.1 License Check
- [ ] License service check tenant license
- [ ] Valid license → Allow operation
- [ ] Invalid/expired license → Block operation

#### 9.2 Document Limit
- [ ] Upload documents đến limit
- [ ] Upload thêm → Error "Document limit exceeded"

---

### 10. Error Handling

#### 10.1 Not Found
- [ ] GET `/api/v1/documents/99999`
- [ ] Response: "Document not found"
- [ ] Status code: 404

#### 10.2 Bad Request
- [ ] POST `/api/v1/documents` không có fileName
- [ ] Response: Validation error
- [ ] Status code: 400

#### 10.3 Unauthorized
- [ ] Request protected endpoint không có token
- [ ] Response: "Unauthorized"
- [ ] Status code: 401

---

## 🚀 Automated Testing

### Quick Test Script
```bash
cd backend
npx ts-node scripts/test-basic-flow.ts
```

Tự động test:
- [x] Login
- [x] Upload document
- [x] List documents
- [x] Create sign request
- [x] Send OTP
- [x] Sign document
- [x] Check status
- [x] Get audit logs

---

## 📊 Test Results

### Summary
- Total test cases: **50+**
- Passed: ___
- Failed: ___
- Skipped: ___

### Issues Found
1. 
2. 
3. 

### Notes
- 
- 
- 

---

## ✅ Sign-off

- [ ] Tất cả test cases đã pass
- [ ] Email service hoạt động (dev & prod)
- [ ] Multi-tenant isolation đúng
- [ ] Audit logs đầy đủ
- [ ] Error handling tốt
- [ ] Documentation đầy đủ

**Tested by**: _______________  
**Date**: _______________  
**Version**: 1.1.0

---

## 🎯 Next Phase

Sau khi test xong Phase 1 + Email Service, tiếp tục với:
- [ ] SMS OTP integration
- [ ] Webhook persistence & retry
- [ ] Audit trail UI
- [ ] Template system
- [ ] QR verification

**Ready for Phase 2**: ☐ Yes ☐ No
