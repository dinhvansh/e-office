# Testing Guide

Tài liệu test gọn cho repo hiện tại.

## 1. Build

### Local

```bash
cd backend && npm run build
cd frontend && npm run build
cd license-server && npm run build
```

### Docker

```bash
docker compose build
docker compose up -d
```

## 2. Smoke test cơ bản

```bash
curl http://localhost:3000/login
curl http://localhost:4000/health
curl http://localhost:5000/health
```

Kỳ vọng:

- frontend `/login` trả `200`
- backend `/health` trả `200`
- license server `/health` trả `200`

## 3. Tài khoản test

- admin:
  - `admin@acme.local`
  - `secret123`
- sample users:
  - password thường là `password123`

## 4. Flow nên test sau mỗi thay đổi lớn

### Approval-only

1. Tạo từ `/sign-requests/create` với loại có `require_approval = true`
2. Xác nhận document và sign request ban đầu ở `draft`
3. Bấm gửi
4. Xác nhận chuyển sang `pending_approval`

### Signing-only

1. Tạo tài liệu có signer
2. Bấm gửi
3. Xác nhận signer đầu tiên là `pending`
4. Xác nhận signer sau là `waiting_signing`

### Approval rồi mới signing

1. Tạo tài liệu có approval và signer
2. Gửi quy trình
3. Approver duyệt hết các bước
4. Xác nhận pha ký mới được kích hoạt

### My Tasks

1. Login bằng user quản lý
2. Vào `/my-tasks`
3. Xác nhận thấy việc duyệt
4. Login bằng signer nội bộ
5. Xác nhận thấy việc ký khi tới lượt

## 5. Điều cần nhớ khi test

- `approver` và `signer` là hai vai trò khác nhau
- workflow chỉ có approver sẽ không tự sinh signer cho editor
- muốn workflow sinh signer thì step phải có `participant_role = signer`

## 6. Playwright

Repo có các file test trong `frontend/tests/`, nhưng không phải file nào cũng là suite chuẩn đang dùng hằng ngày.

Nếu cần E2E thực chiến, nên chạy sau khi:

- stack Docker đã lên
- DB đã seed
- env đã đúng

## 7. Nếu thấy dữ liệu cũ hoặc lệch

Chạy lại seed:

```bash
docker exec eoffice-backend node scripts/seed-rbac.js
docker exec eoffice-backend node scripts/seed-document-types.js
docker exec eoffice-backend node scripts/seed-workflows-simple.js
```
