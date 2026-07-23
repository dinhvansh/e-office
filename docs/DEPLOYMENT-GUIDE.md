# Deployment Guide

> **Hướng dẫn lỗi thời.** Chỉ giữ lại để tham khảo lịch sử. Dùng
> [`../INSTALL-PRODUCTION.md`](../INSTALL-PRODUCTION.md) và
> [`BACKUP-RESTORE.md`](BACKUP-RESTORE.md).

Tài liệu deploy chuẩn cho trạng thái repo hiện tại.

## 1. Mô hình deploy

Stack mặc định gồm:

- `db` PostgreSQL 16
- `redis` Redis 7
- `license-server`
- `backend`
- `frontend`

Tất cả được dựng bằng `docker compose`.

## 2. Chuẩn bị

Yêu cầu:

- Docker
- Docker Compose plugin
- git

Clone repo:

```bash
git clone https://github.com/dinhvansh/e-office.git
cd e-office
```

## 3. Tạo file môi trường

```bash
cp .env.compose.example .env
```

Các biến tối thiểu cần đổi:

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`
- `LICENSE_SIGNING_SECRET`
- `CORS_ORIGIN`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_API_BASE_URL`

## 4. Build và chạy

```bash
docker compose up -d --build
```

## 5. Khởi tạo database

```bash
docker exec eoffice-backend npx prisma migrate deploy
docker exec eoffice-backend node scripts/seed.js
docker exec eoffice-backend node scripts/seed-rbac.js
docker exec eoffice-backend node scripts/seed-document-types.js
docker exec eoffice-backend node scripts/seed-workflows-simple.js
```

Nếu có dữ liệu tổ chức mẫu riêng, chạy thêm script seed tương ứng sau bước trên.

## 6. Kiểm tra nhanh

```bash
curl http://localhost:3000/login
curl http://localhost:4000/health
curl http://localhost:5000/health
```

## 7. Quick deploy script

Repo có `quick-deploy.sh` để dựng nhanh trên máy mới.

Script hiện làm các việc:

- cài Docker nếu thiếu
- tạo `.env` từ `.env.compose.example`
- sinh secret cơ bản
- `docker compose up -d --build`
- migrate + seed

Chạy:

```bash
sudo bash quick-deploy.sh
```

## 8. Tài khoản mặc định sau seed

- email: `admin@acme.local`
- password: the unique value supplied through `DEMO_ADMIN_PASSWORD`

## 9. Lệnh vận hành thường dùng

```bash
docker compose logs -f
docker compose ps
docker compose restart backend
docker compose down
```

## 10. Lưu ý

- `frontend` có thể trả `200` bình thường dù Docker healthcheck chưa xanh ngay.
- Dữ liệu file ký và upload nằm trong `backend/storage/`.
- Không nên commit lại file trong `backend/storage/` hoặc `backend/backups/`.
