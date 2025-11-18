# Testing Guide - WP Sign

## Prerequisites

1. Backend server đang chạy: `npm run dev` (port 4000)
2. Database đã được seed: `npm run prisma db seed`
3. Redis đang chạy (nếu cần)

## Test Accounts

Từ seed script:

```
Tenant 1:
- Email: admin@tenant1.com
- Password: password123

Tenant 2:
- Email: admin@tenant2.com
- Password: password123
```

## Manual Testing Flow

### 1. Login
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@tenant1.com",
    "password": "password123"
  }'
```

Lưu `accessToken` từ response.

### 2. Upload Document
```bash
curl -X POST http://localhost:4000/api/v1/documents \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "contract.pdf",
    "base64": "JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0xlbmd0aCAzMwo+PgpzdHJlYW0KQlQKL0YxIDEyIFRmCjEwMCA3MDAgVGQKKFRlc3QpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmCjAwMDAwMDAwMDkgMDAwMDAgbgowMDAwMDAwMDU4IDAwMDAwIG4KMDAwMDAwMDEzNiAwMDAwMCBuCjAwMDAwMDAxOTYgMDAwMDAgbgp0cmFpbGVyCjw8Ci9TaXplIDUKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjI3OAolJUVPRg=="
  }'
```

Lưu `id` của document.

### 3. Create Sign Request
```bash
curl -X POST http://localhost:4000/api/v1/sign-requests \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": 1,
    "title": "Hợp đồng thuê nhà",
    "message": "Vui lòng xem và ký tài liệu",
    "workflow_type": "sequential",
    "signers": [
      {
        "email": "signer@example.com",
        "name": "Nguyễn Văn A",
        "role": "signer"
      }
    ]
  }'
```

Lưu `id` của sign request và `signers[0].id`.

### 4. Send OTP
```bash
curl -X POST http://localhost:4000/api/v1/signers/1/send-otp \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Kiểm tra console log hoặc email để lấy OTP.

### 5. Sign Document
```bash
curl -X POST http://localhost:4000/api/v1/signers/1/sign \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "otp": "123456",
    "signature_data": {
      "x": 100,
      "y": 200,
      "width": 150,
      "height": 50,
      "page": 1
    }
  }'
```

### 6. Check Sign Request Status
```bash
curl -X GET http://localhost:4000/api/v1/sign-requests/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 7. Get Audit Logs
```bash
curl -X GET http://localhost:4000/api/v1/audit/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Automated Testing

### Run Test Script
```bash
cd backend
npx ts-node scripts/test-basic-flow.ts
```

Script này sẽ tự động test toàn bộ flow:
1. ✅ Login
2. ✅ Upload document
3. ✅ List documents
4. ✅ Create sign request
5. ✅ Send OTP
6. ✅ Sign document
7. ✅ Check status
8. ✅ Get audit logs

### E2E Tests (Playwright)
```bash
cd frontend
npm run test:e2e
```

## Testing Email

### Development Mode (Console Log)
Không cần cấu hình SMTP. Email sẽ được log ra console:

```bash
# backend/.env
SMTP_USER=
```

### Production Mode (Real Email)
Cấu hình SMTP trong `.env`:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@wpsign.local
EMAIL_FROM_NAME=WP Sign
```

Test bằng cách gửi OTP và kiểm tra inbox.

## Common Issues

### 1. "Invalid credentials"
- Kiểm tra email/password
- Chạy seed script: `npm run prisma db seed`

### 2. "Document not found"
- Kiểm tra document_id có đúng không
- Kiểm tra tenant isolation

### 3. "OTP expired"
- OTP có hiệu lực 10 phút
- Gửi OTP mới

### 4. "Invalid OTP"
- Kiểm tra OTP từ email/console
- OTP là 6 chữ số

### 5. Email không gửi được
- Kiểm tra SMTP config
- Xem console log
- Test với Gmail App Password

## Next Steps

- [ ] Add integration tests với Jest
- [ ] Add load testing với k6
- [ ] Add API documentation với Swagger
- [ ] Add monitoring với Prometheus
- [ ] Add error tracking với Sentry
