# Luồng dữ liệu chính (tóm tắt)

Tài liệu này mô tả các luồng dữ liệu quan trọng trong hệ thống hiện tại.

---

## 1. Flow đăng nhập

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant BE as Backend /auth
  participant DB as PostgreSQL

  U->>FE: Submit email/password
  FE->>BE: POST /api/v1/auth/login
  BE->>DB: Tìm user theo email
  DB-->>BE: User + tenant
  BE->>BE: So khớp mật khẩu (bcrypt)
  BE->>BE: Phát hành access + refresh token (JWT)
  BE-->>FE: { success, data: { tokens, user, tenant } }
  FE->>FE: Lưu vào AuthContext + localStorage
  FE-->>U: Redirect về "/"
```

---

## 2. Flow upload tài liệu

```mermaid
sequenceDiagram
  participant U as User
  participant FE as DocumentsPage
  participant BE as DocumentsService
  participant Lic as LicenseService
  participant FS as FileStorage
  participant Repo as DocumentsRepository
  participant Audit as AuditService

  U->>FE: Chọn file, nhấn "Tải"
  FE->>FE: Chuyển file → base64
  FE->>BE: POST /api/v1/documents { file_name, file_base64 }
  BE->>Lic: enforceDocumentLimit(tenantId)
  Lic-->>BE: OK hoặc lỗi license
  BE->>FS: saveBase64Document(tenantId, file_name, base64)
  FS-->>BE: file_path
  BE->>Repo: create({ tenant_id, owner_id, file_path, hash, status })
  Repo-->>BE: document
  BE->>Audit: record("document.uploaded", ...)
  BE-->>FE: { success, data: { document } }
```

Hiện tại metadata E‑Office (document_type, number, ...) **chưa** được sử dụng trong flow này.

---

## 3. Flow tạo yêu cầu ký

```mermaid
sequenceDiagram
  participant U as User
  participant FE as SignRequestsPage
  participant BE as SignRequestsService
  participant Lic as LicenseService
  participant Docs as DocumentsRepository
  participant SR as SignRequestsRepository
  participant SRepo as SignersRepository
  participant Audit as AuditService
  participant WH as WebhookService

  U->>FE: Chọn document + nhập title/message + signers
  FE->>BE: POST /api/v1/sign-requests { document_id, signers[]... }
  BE->>Lic: ensureLicenseForTenant(tenantId)
  Lic-->>BE: OK hoặc lỗi license
  BE->>Docs: findById(document_id, tenantId)
  Docs-->>BE: document hoặc null
  BE->>SR: create(sign_request)
  SR-->>BE: sign_request
  BE->>SRepo: createMany(signers cho sign_request.id)
  SRepo-->>BE: OK
  BE->>Audit: record("sign.started", ...)
  BE->>WH: emit("sign.started", { sign_request_id, document_id })
  BE-->>FE: { success, data: { sign_request } }
```

---

## 4. Flow gửi OTP & ký

### 4.1 Gửi OTP

```mermaid
sequenceDiagram
  participant U as Internal user
  participant FE as SR Detail UI
  participant BE as SignersService
  participant Repo as SignersRepository
  participant Email as EmailService

  U->>FE: Nhấn "Gửi OTP"
  FE->>BE: POST /api/v1/signers/:id/send-otp
  BE->>Repo: findById(signerId) (include sign_request + tenant)
  Repo-->>BE: signer
  BE->>BE: generateOtp() + bcrypt.hash
  BE->>Repo: update(otp, otp_expire, status="otp_sent")
  Repo-->>BE: OK
  BE->>Email: sendOtpEmail(...)
  Email-->>BE: OK (hoặc log lỗi)
  BE-->>FE: { success: true }
```

### 4.2 Ký với OTP

```mermaid
sequenceDiagram
  participant S as Signer
  participant App as Signing UI
  participant BE as SignersService
  participant Repo as SignersRepository
  participant Prisma as PrismaClient
  participant Audit as AuditService
  participant WH as WebhookService

  S->>App: Nhập OTP + submit
  App->>BE: POST /api/v1/signers/:id/sign { otp, signature_data? }
  BE->>Repo: findById(signerId)
  Repo-->>BE: signer + sign_request
  BE->>BE: kiểm tra otp/expiry
  BE->>Repo: update(status="completed", signed_at, otp=null,...)
  BE->>Prisma: countCompleted/countTotal(sign_request_id)
  BE->>Prisma: update sign_requests.status + documents.status
  BE->>Audit: record("sign.completed", ...)
  BE->>WH: emit("sign.completed", { sign_request_id, signer_id })
  BE-->>App: { success: true }
```

---

## 5. Flow numbering (hiện tại)

Module `numbering` cung cấp API độc lập để generate/preview số văn bản, chưa gắn trực tiếp vào `DocumentsService`.

```mermaid
sequenceDiagram
  participant FE as Admin UI
  participant BE as NumberingService
  participant Repo as NumberingRepository

  FE->>BE: POST /api/v1/numbering-rules/generate { document_type_id, departmentCode? }
  BE->>Repo: findByDocumentType(tenantId, document_type_id)
  Repo-->>BE: rule(pattern, last_number,...)
  BE->>Repo: incrementNumber(rule.id, currentYear)
  Repo-->>BE: { number }
  BE->>BE: build documentNumber từ pattern + tokens
  BE-->>FE: { success, data: { document_number } }
```

Để trở thành E‑Office hoàn chỉnh, số này cần được gắn vào `documents.document_number` khi upload/khởi tạo document.

