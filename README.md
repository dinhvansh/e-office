# FlowDocker E-Office

Document Workflow, Approval & E-Signing Platform

FlowDocker E-Office is a self-hosted platform for routing internal documents
through approval and signing workflows. It combines a Next.js workspace, a
TypeScript API, and PostgreSQL-backed auditability for organizations that need
structured document handling without giving up control of their deployment.

> **Alpha status:** this release is intended for evaluation in an isolated
> environment. Review the limitations below before any production deployment.

## Key features

- Internal approval workflows and sequential or parallel internal signing.
- External signing links protected by OTP verification.
- Multi-tenant workspaces with RBAC, document ACLs, audit events, and scoped
  access controls.
- Local filesystem storage by default, with optional S3-compatible storage
  (including MinIO).
- Docker deployment with PostgreSQL, Redis, backend, frontend, and an optional
  license service.

## Architecture at a glance

```text
Browser → Next.js frontend → Express API → PostgreSQL / Redis
                                 └──────→ Local storage or S3-compatible storage
```

## Docker quick start

1. Copy `.env.compose.example` to `.env` and set unique secrets and URLs.
2. Start the stack:

   ```bash
   docker compose up -d --build
   ```

3. Open `http://localhost:3000`. The API is available at
   `http://localhost:4000`.

For a demo-only database, set `AUTO_INIT_DB=true` explicitly before starting
the backend. It runs a destructive schema push and seed, so never use it with
data that must be retained.

## Project governance

FlowDocker E-Office is source-available fair-code software, not OSI open
source. The
[Community Source License](LICENSE) allows internal self-hosting, internal
modification, evaluation, learning, non-commercial personal use, development,
testing, and contribution. Commercial hosted resale, managed-service resale,
white-label resale, OEM or embedded distribution, and commercial redistribution
as a competing product require a separate commercial license.

Trademark and logo rights are not granted automatically. See
[COMMERCIAL-LICENSING.md](COMMERCIAL-LICENSING.md),
[TRADEMARK.md](TRADEMARK.md), [CONTRIBUTING.md](CONTRIBUTING.md), and
[SECURITY.md](SECURITY.md). FlowDocker™ and FlowDocker E-Office™ are trademarks
of Nguyễn Đình Văn. Copyright © 2026 Nguyễn Đình Văn. All rights reserved. The
licensing and policy package is a publication
draft subject to maintainer approval; it must not be described as external
legal approval.

## v0.1.0-alpha scope and limitations

This alpha is for evaluation in an isolated environment. The built-in signing
flow is not represented as a qualified electronic signature, a PKI service, or
PAdES compliance. Production deployments must supply their own approved
certificate, key-management, and compliance controls. Local filesystem storage
is the default; S3-compatible storage and the license service are optional and
disabled unless explicitly configured. Never commit production secrets or SMTP
credentials; create local environment files only from the included examples.

## PDF Unicode fonts

PDF annotations use Noto Sans so Vietnamese text is embedded without
transliteration. Noto fonts are licensed under the SIL Open Font License 1.1.
The backend Docker image installs the Alpine `font-noto` package. For custom
deployments, mount an approved Noto Sans font and set
`PDF_UNICODE_FONT_PATH` (and optionally `PDF_UNICODE_BOLD_FONT_PATH`); do not
replace it with a font whose redistribution licence is incompatible with the
deployment.

Monorepo cho hệ thống quản lý tài liệu, phê duyệt nội bộ và ký điện tử.

## Thành phần

- `frontend`: Next.js 16, dashboard nội bộ và trang ký công khai
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

## Tài khoản demo an toàn

Sau khi seed dữ liệu:

Seed demo yêu cầu `DEMO_ADMIN_PASSWORD` rõ ràng (ít nhất 16 ký tự). Không có
mật khẩu mặc định cho production; chỉ seed vào database demo/local riêng biệt.

## Docker configuration details

1. Tạo file `.env` từ mẫu:

```bash
cp .env.compose.example .env
```

2. Sửa các giá trị secret và URL trong `.env`.

3. Build và chạy stack:

```bash
docker compose up -d --build
```

4. Backend không tự động khởi tạo hoặc seed DB theo mặc định. Với một database demo
   cô lập, đặt `AUTO_INIT_DB=true` trước khi khởi động container; thao tác này chạy
   `prisma db push --accept-data-loss` và seed dữ liệu mẫu, nên không dùng cho môi trường có dữ liệu cần giữ.

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

## Docker PostgreSQL E2E

Chạy workflow E2E cô lập (PostgreSQL, Redis, backend và outbox worker) bằng một lệnh:

```bash
npm run e2e:docker
```

Lệnh dùng `.env.test.example` để tạo env tạm, project Docker `eoffice-e2e` và
xóa containers/volumes khi kết thúc. Các credential trong template chỉ dành cho
test cô lập, không phải production secret; helper không đọc, tạo hoặc ghi đè `.env`.
Đặt `E2E_KEEP_CONTAINERS=1` khi cần giữ stack để chẩn đoán lỗi.

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
