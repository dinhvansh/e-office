# E-Office

Monorepo cho hệ thống quản lý tài liệu, phê duyệt nội bộ và ký điện tử.

## Thành phần

- `frontend`: Next.js 14, dashboard nội bộ và trang ký công khai
- `backend`: Express + TypeScript + Prisma
- `license-server`: service kiểm tra license độc lập
- `docker-compose.yml`: stack local/prod cơ bản với Postgres, Redis, backend, frontend, license server

## Trạng thái hiện tại

Repo hiện đang chạy theo mô hình:

- tạo tài liệu từ màn `/sign-requests/create`
- tạo ra `document` và `sign_request` ở trạng thái `draft`
- người tạo vào editor để thêm/chỉnh signer và field
- bấm gửi thì mới bắt đầu approval hoặc signing

Flow hiện tại:

- loại văn bản có `require_approval = true`
  - tạo nháp trước
  - gửi xong mới chuyển sang `pending_approval`
- loại văn bản có `require_digital_signing = true` hoặc có signer thủ công
  - tạo nháp trước
  - gửi xong mới chuyển sang `pending_signature`

## Tài khoản mẫu

Sau khi seed dữ liệu:

- Admin:
  - email: `admin@acme.local`
  - password: `secret123`
- Các tài khoản mẫu tổ chức:
  - password mặc định: `password123`

## Chạy bằng Docker

1. Tạo file `.env` từ mẫu:

```bash
cp .env.compose.example .env
```

2. Sửa các giá trị secret và URL trong `.env`.

3. Build và chạy stack:

```bash
docker compose up -d --build
```

4. Backend sẽ tự động khởi tạo DB khi container start (`prisma db push` + seed mặc định).

Nếu cần chạy lại seed thủ công:

```bash
docker exec eoffice-backend node scripts/seed.js
docker exec eoffice-backend node scripts/seed-rbac.js
docker exec eoffice-backend node scripts/seed-document-types.js
docker exec eoffice-backend node scripts/seed-workflows-simple.js
```

URL mặc định:

- frontend: `http://localhost:3000`
- backend: `http://localhost:4000`
- license server: `http://localhost:5000`

## Chạy local không qua Docker

1. Tạo env:

- `backend/.env`
- `frontend/.env.local`
- `license-server/.env`

2. Cài package cho từng service.

3. Chạy Postgres và Redis riêng.

4. Chạy build hoặc dev:

```bash
cd backend && npm run build
cd frontend && npm run build
cd license-server && npm run build
```

## Tài liệu nên đọc trước

- [START-HERE-E-OFFICE.md](START-HERE-E-OFFICE.md)
- [FUNCTIONAL_SPEC.md](FUNCTIONAL_SPEC.md)
- [docs/README.md](docs/README.md)
- [docs/DEPLOYMENT-GUIDE.md](docs/DEPLOYMENT-GUIDE.md)
- [docs/testing-guide.md](docs/testing-guide.md)
- [docs/dev/AUTHORIZATION-MODEL.md](docs/dev/AUTHORIZATION-MODEL.md)
- [docs/dev/API-RESPONSE-GUIDELINE.md](docs/dev/API-RESPONSE-GUIDELINE.md)
- [docs/dev/BUSINESS-PROCESS.md](docs/dev/BUSINESS-PROCESS.md)
- [docs/dev/USER-GUIDE.md](docs/dev/USER-GUIDE.md)
- [docs/dev/E2E-TEST-MATRIX.md](docs/dev/E2E-TEST-MATRIX.md)
- [docs/dev/PROJECT-CLEANUP.md](docs/dev/PROJECT-CLEANUP.md)

## Kiểm tra phân quyền trước khi merge

```bash
cd backend
npm run test:auth-matrix
```

Lệnh trên kiểm tra tenant isolation, RBAC module-level và resource-level authorization cho các luồng chính.

Các lệnh E2E chuẩn ở root:

```bash
npm run e2e:auth
npm run e2e:workflow
npm run e2e:smoke
```

## Lưu ý quan trọng

- `docs/archive/` và `docs/dev/` chứa tài liệu lịch sử, ghi chép phiên làm việc và phân tích cũ.
- Nguồn sự thật hiện tại là code đang chạy, file env example, `README.md`, và các doc chính vừa liệt kê ở trên.
- Repo đã được dọn bớt file backup, PDF test output và file workflow backup khỏi source tree.
