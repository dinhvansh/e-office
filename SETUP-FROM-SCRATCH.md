# Setup From Scratch - Hướng dẫn cài đặt từ đầu

> **Obsolete installation guide.** Các lệnh bên dưới là ghi chú lịch sử và
> không khớp Compose hiện tại. Dùng `INSTALL-DEMO.md` hoặc
> `INSTALL-PRODUCTION.md`; không dùng `prisma db push` hay force reset với dữ
> liệu cần lưu giữ.

## 🔄 Reset và Clone từ Git

### 1. Backup data cũ (nếu cần)
```bash
# Backup database
cd backend
node scripts/backup-database.js

# Backup storage files
xcopy storage storage-backup /E /I
```

### 2. Xóa project cũ
```bash
# Thoát khỏi folder hiện tại
cd ..

# Xóa folder cũ (cẩn thận!)
rmdir /s /q "e-office"
```

### 3. Clone từ Git
```bash
# Clone repository
git clone https://github.com/your-username/e-office.git
cd e-office

# Hoặc nếu đã có folder
cd e-office
git pull origin main
```

## 🚀 Setup Local Development

### Bước 1: Cài đặt Dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# Quay về root
cd ..
```

### Bước 2: Setup Backend
```bash
cd backend

# 1. Tạo file .env
copy .env.example .env

# 2. Sửa .env (quan trọng!)
# Mở file .env và sửa:
# - DATABASE_URL (nếu cần)
# - JWT_SECRET (đổi thành secret mạnh)
# - SMTP settings (nếu cần email)

# 3. Generate Prisma Client
npx prisma generate

# 4. Push schema to database
npx prisma db push

# 5. Seed data
node scripts/seed-rbac.js
node scripts/seed-document-types.js
node scripts/seed-workflows-simple.js
node scripts/seed-org-final.js
```

### Bước 3: Setup Frontend
```bash
cd ../frontend

# Tạo .env.local
echo NEXT_PUBLIC_API_URL=http://localhost:4000 > .env.local
```

### Bước 4: Start Services
```bash
# Từ root folder
npm run dev

# Hoặc start riêng:
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Bước 5: Test
```
Frontend: http://localhost:3000
Backend:  http://localhost:4000
Login:    admin@acme.local / value supplied through DEMO_ADMIN_PASSWORD
```

## 🐳 Setup với Docker

### Bước 1: Clone code (như trên)
```bash
git clone https://github.com/your-username/e-office.git
cd e-office
```

### Bước 2: Tạo .env files
```bash
# Backend
cd backend
copy .env.example .env
# Sửa JWT_SECRET trong .env (phải >= 32 ký tự)

# Frontend
cd ../frontend
echo NEXT_PUBLIC_API_URL=http://localhost:4000 > .env.local
cd ..
```

### Bước 3: Start Docker
```bash
# Build và start
docker-compose up -d

# Xem logs
docker-compose logs -f
```

### Bước 4: Setup Database
```bash
# Chờ services ready (30 giây)
# Sau đó chạy seeds:

docker-compose exec backend npx prisma db push
docker-compose exec backend node scripts/seed-rbac.js
docker-compose exec backend node scripts/seed-document-types.js
docker-compose exec backend node scripts/seed-workflows-simple.js
docker-compose exec backend node scripts/seed-org-final.js
```

### Bước 5: Test
```
Frontend: http://localhost:3000
Backend:  http://localhost:4000
Login:    admin@acme.local / value supplied through DEMO_ADMIN_PASSWORD
```

## 🔧 Troubleshooting

### Lỗi: npm install failed
```bash
# Xóa node_modules và package-lock.json
rm -rf node_modules package-lock.json
npm install
```

### Lỗi: Prisma client not found
```bash
cd backend
npx prisma generate
```

### Lỗi: Database connection failed
```bash
# Kiểm tra PostgreSQL đang chạy
# Kiểm tra DATABASE_URL trong .env
# Restart PostgreSQL service
```

### Lỗi: Port already in use
```bash
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :4000

# Kill process hoặc đổi port
```

### Lỗi: Docker build failed
```bash
# Xóa containers và volumes cũ
docker-compose down -v

# Xóa images cũ
docker-compose down --rmi all

# Build lại
docker-compose build --no-cache
docker-compose up -d
```

## 📝 Checklist Setup

### Local Development
- [ ] Clone code từ Git
- [ ] Install dependencies (backend + frontend)
- [ ] Tạo backend/.env
- [ ] Tạo frontend/.env.local
- [ ] Chạy `npx prisma generate`
- [ ] Chạy `npx prisma db push`
- [ ] Chạy seeds (4 files)
- [ ] Start backend: `npm run dev`
- [ ] Start frontend: `npm run dev`
- [ ] Test login tại http://localhost:3000

### Docker
- [ ] Clone code từ Git
- [ ] Tạo backend/.env (JWT_SECRET >= 32 chars)
- [ ] Tạo frontend/.env.local
- [ ] Chạy `docker-compose up -d`
- [ ] Đợi services ready
- [ ] Chạy seeds trong container
- [ ] Test login tại http://localhost:3000

## 🎯 Default Credentials

```
Email:    admin@acme.local
Password: value supplied through DEMO_ADMIN_PASSWORD
```

**⚠️ Đổi password ngay sau khi login lần đầu!**

## 📚 Tài liệu tham khảo

- **Docker**: `docs/docker/README.md`
- **Development**: `docs/dev/README.md`
- **Testing**: `docs/testing-guide.md`
- **Email Setup**: `docs/email-setup.md`

## 🔐 Security Notes

### Trước khi deploy production:
1. Đổi JWT_SECRET thành secret mạnh (>= 32 chars)
2. Đổi REFRESH_TOKEN_SECRET
3. Đổi admin password
4. Setup SMTP cho email
5. Configure CORS cho domain thật
6. Enable HTTPS/SSL
7. Review SECURITY-CHECKLIST.md

## 💡 Tips

### Nhanh hơn với script
```bash
# Windows
.\scripts\setup-all.ps1

# Linux/Mac
./scripts/setup-all.sh
```

### Reset database
```bash
cd backend
npx prisma db push --force-reset
node scripts/seed-rbac.js
node scripts/seed-document-types.js
node scripts/seed-workflows-simple.js
node scripts/seed-org-final.js
```

### Clean install
```bash
# Xóa tất cả
rm -rf node_modules backend/node_modules frontend/node_modules
rm -rf package-lock.json backend/package-lock.json frontend/package-lock.json

# Install lại
npm install
cd backend && npm install
cd ../frontend && npm install
```

---
*Last updated: 2025-12-03*
