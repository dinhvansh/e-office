# Docker Test Guide - Hướng dẫn Test Docker

## Chuẩn bị trên máy mới

### 1. Yêu cầu hệ thống
- Docker Desktop (Windows/Mac) hoặc Docker Engine (Linux)
- Docker Compose v2.0+
- Ít nhất 4GB RAM available
- 10GB disk space

### 2. Kiểm tra Docker
```bash
docker --version
docker-compose --version
```

## Test trên máy hiện tại

### Bước 1: Clean build từ đầu
```bash
# Stop và xóa containers cũ
docker-compose down -v

# Xóa images cũ (optional)
docker-compose down --rmi all

# Build lại từ đầu
docker-compose build --no-cache
```

### Bước 2: Start services
```bash
docker-compose up -d
```

### Bước 3: Kiểm tra logs
```bash
# Xem logs tất cả services
docker-compose logs -f

# Hoặc xem từng service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Bước 4: Chờ services khởi động
```bash
# Kiểm tra health status
docker-compose ps

# Đợi backend ready (có thể mất 1-2 phút)
curl http://localhost:4000/health

# Đợi frontend ready
curl http://localhost:3000
```

### Bước 5: Setup database
```bash
# Vào container backend
docker-compose exec backend sh

# Chạy migrations và seeds
npx prisma migrate deploy
node scripts/seed-rbac.js
node scripts/seed-document-types.js
node scripts/seed-workflows-simple.js
node scripts/seed-org-final.js

# Exit container
exit
```

### Bước 6: Test application
1. Mở browser: http://localhost:3000
2. Login với: admin@acme.local / admin123
3. Test các chức năng cơ bản:
   - Tạo document
   - Tạo workflow
   - Approval flow
   - Sign request

## Test trên máy khác

### Bước 1: Copy project
```bash
# Tạo archive (trên máy hiện tại)
git archive --format=zip --output=e-office.zip HEAD

# Hoặc clone từ git
git clone <repository-url>
cd e-office
```

### Bước 2: Tạo .env files
```bash
# Backend .env
cd backend
cp .env.example .env

# Sửa các giá trị trong .env nếu cần:
# - DATABASE_URL (nếu dùng external DB)
# - JWT_SECRET (generate mới)
# - SMTP settings (nếu cần email)

# Frontend .env.local
cd ../frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
```

### Bước 3: Build và start
```bash
cd ..
docker-compose up -d
```

### Bước 4: Setup database (như trên)

## Troubleshooting

### Lỗi: Port already in use
```bash
# Kiểm tra port đang dùng
netstat -ano | findstr :3000
netstat -ano | findstr :4000
netstat -ano | findstr :5432

# Stop service đang dùng port hoặc đổi port trong docker-compose.yml
```

### Lỗi: Database connection failed
```bash
# Kiểm tra DB container
docker-compose logs db

# Restart DB
docker-compose restart db

# Kiểm tra connection từ backend
docker-compose exec backend sh
npx prisma migrate deploy
```

### Lỗi: Build failed
```bash
# Xem logs chi tiết
docker-compose build backend --progress=plain

# Xóa cache và build lại
docker system prune -a
docker-compose build --no-cache
```

### Lỗi: Out of memory
```bash
# Tăng memory cho Docker Desktop
# Settings > Resources > Memory > 4GB+

# Hoặc build từng service
docker-compose build backend
docker-compose build frontend
docker-compose build license-server
```

## Production Deployment

### Sử dụng production docker-compose
```bash
# Tạo docker-compose.prod.yml với:
# - Environment variables từ secrets
# - Volume mounts cho storage
# - Restart policies
# - Resource limits

docker-compose -f docker-compose.prod.yml up -d
```

### Backup data
```bash
# Backup database
docker-compose exec db pg_dump -U esign esign > backup.sql

# Backup storage
docker cp $(docker-compose ps -q backend):/app/storage ./storage-backup
```

## Checklist Test

- [ ] Docker build thành công (backend, frontend, license-server)
- [ ] Tất cả containers start và healthy
- [ ] Database migrations chạy thành công
- [ ] Seeds chạy thành công
- [ ] Frontend accessible tại http://localhost:3000
- [ ] Backend API accessible tại http://localhost:4000
- [ ] Login thành công
- [ ] Tạo document thành công
- [ ] Upload file thành công
- [ ] Approval flow hoạt động
- [ ] Sign request hoạt động
- [ ] Email notifications (nếu config SMTP)

## Notes

- Lần đầu build có thể mất 5-10 phút
- Database seeds cần chạy thủ công sau khi start
- Storage folder được mount vào container
- Logs có thể xem bằng `docker-compose logs`
