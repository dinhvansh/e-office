# Setup E-Office trên Máy Mới - Hướng Dẫn Đầy Đủ

**Mục đích**: Hướng dẫn setup toàn bộ project từ đầu trên máy mới, bao gồm môi trường, thư viện, database, và data.

**Thời gian ước tính**: 30-45 phút

---

## 📋 Yêu Cầu Hệ Thống

### Phần Mềm Cần Cài Đặt

1. **Node.js** (v18 hoặc cao hơn)
   - Download: https://nodejs.org/
   - Kiểm tra: `node --version` và `npm --version`

2. **Git**
   - Download: https://git-scm.com/
   - Kiểm tra: `git --version`

3. **Docker Desktop** (cho PostgreSQL + Redis)
   - Download: https://www.docker.com/products/docker-desktop
   - Kiểm tra: `docker --version` và `docker-compose --version`

4. **VS Code** (khuyến nghị)
   - Download: https://code.visualstudio.com/
   - Extensions: Prisma, ESLint, Prettier, REST Client

---

## 🚀 Bước 1: Clone Project

```bash
# Clone repository
git clone https://github.com/dinhvansh/e-office.git
cd e-office

# Kiểm tra branch
git branch
# Nên ở branch: main
```

---

## 📦 Bước 2: Cài Đặt Dependencies

### 2.1. Backend Dependencies

```bash
cd backend
npm install
```

**Thư viện chính**:
- `@prisma/client` - Database ORM
- `express` - Web framework
- `jsonwebtoken` - Authentication
- `bcryptjs` - Password hashing
- `zod` - Validation
- `nodemailer` - Email service
- `multer` - File upload
- `redis` - Caching

### 2.2. Frontend Dependencies

```bash
cd ../frontend
npm install
```

**Thư viện chính**:
- `next` - React framework
- `react`, `react-dom` - UI library
- `@tanstack/react-query` - Data fetching
- `tailwindcss` - CSS framework
- `lucide-react` - Icons
- `sonner` - Toast notifications
- `@radix-ui/*` - UI components (shadcn/ui)

### 2.3. License Server Dependencies

```bash
cd ../license-server
npm install
```

---

## 🐳 Bước 3: Khởi Động Docker Services

```bash
# Quay về root directory
cd ..

# Start PostgreSQL + Redis
docker-compose up -d

# Kiểm tra services đang chạy
docker-compose ps
```

**Kết quả mong đợi**:
```
NAME                IMAGE               STATUS
e-office-postgres   postgres:15         Up
e-office-redis      redis:7-alpine      Up
```

---

## 🗄️ Bước 4: Setup Database

### 4.1. Tạo File .env

```bash
cd backend

# Copy file .env.example
copy .env.example .env
# Hoặc trên Linux/Mac: cp .env.example .env
```

### 4.2. Cấu Hình .env

Mở file `backend/.env` và cập nhật:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/e_office?schema=public"

# JWT Secrets (generate mới nếu production)
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379

# Email (optional - để dev mode)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
EMAIL_FROM="noreply@e-office.local"
EMAIL_DEV_MODE="true"

# Storage
STORAGE_BASE_PATH="./storage"
MAX_FILE_SIZE=10485760

# Server
PORT=4000
NODE_ENV="development"
```

### 4.3. Chạy Migrations

```bash
cd backend

# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push

# Kiểm tra database
npx prisma studio
# Mở browser: http://localhost:5555
```

---

## 📊 Bước 5: Import Data (Chọn 1 trong 2 cách)

### Cách 1: Restore từ Backup File (Khuyến nghị)

**Nếu có file backup từ máy cũ**:

```bash
cd backend

# Copy file backup vào thư mục backups/
# VD: backend/backups/database-backup-2025-11-23T10-30-00.json

# Restore data
node scripts/restore-database.js database-backup-2025-11-23T10-30-00.json
```

### Cách 2: Seed Data Mới (Nếu không có backup)

```bash
cd backend

# Chạy tất cả seed scripts
node scripts/seed-rbac.js
node scripts/seed-document-types.js
node scripts/seed-workflows-simple.js
node scripts/seed-org-simple.js

# Hoặc chạy script tổng hợp (PowerShell)
.\scripts\run-all-seeds.ps1
```

**Data được tạo**:
- 1 tenant: ACME Corporation
- 5 departments: Ban Giám Đốc, Phòng Hành Chính, Phòng Kế Toán, Phòng Kinh Doanh, Phòng Kỹ Thuật
- 12 positions: CEO, CFO, Manager, Staff, etc.
- 4 roles: Admin, Manager, User, Viewer
- 27 permissions
- 1 admin user: `admin@acme.local` / `Admin@123`
- 8 document types
- 3 workflows
- 5 external organizations

---

## 🎨 Bước 6: Setup Frontend

```bash
cd frontend

# Tạo file .env.local
copy .env.example .env.local
# Hoặc: cp .env.example .env.local
```

**Nội dung `frontend/.env.local`**:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

---

## ▶️ Bước 7: Khởi Động Servers

### Cách 1: Chạy Từng Server (Khuyến nghị cho dev)

**Terminal 1 - Backend**:
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

**Terminal 3 - License Server**:
```bash
cd license-server
npm run dev
```

### Cách 2: Chạy Tất Cả (PowerShell Script)

```powershell
# Từ root directory
.\start-all.ps1
```

---

## ✅ Bước 8: Kiểm Tra Hệ Thống

### 8.1. Kiểm Tra Services

- **Backend API**: http://localhost:4000/health
- **Frontend**: http://localhost:3000
- **License Server**: http://localhost:5000/health
- **Prisma Studio**: http://localhost:5555

### 8.2. Test Login

1. Mở browser: http://localhost:3000
2. Login với:
   - Email: `admin@acme.local`
   - Password: `Admin@123`
3. Kiểm tra menu sidebar (Admin nên thấy tất cả menu)

### 8.3. Test API (VS Code REST Client)

Mở file `test-api.http` và chạy các test cases:

```http
### 1. Health Check
GET http://localhost:4000/health

### 2. Login
POST http://localhost:4000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@acme.local",
  "password": "Admin@123"
}

### 3. Get Documents (cần token từ login)
GET http://localhost:4000/api/v1/documents
Authorization: Bearer YOUR_TOKEN_HERE
```

---

## 🔧 Bước 9: Troubleshooting

### Lỗi: "Port already in use"

```bash
# Tìm process đang dùng port
netstat -ano | findstr :4000
netstat -ano | findstr :3000

# Kill process (thay PID)
taskkill /PID <PID> /F
```

### Lỗi: "Cannot connect to database"

```bash
# Kiểm tra Docker
docker-compose ps

# Restart Docker services
docker-compose down
docker-compose up -d

# Kiểm tra logs
docker-compose logs postgres
```

### Lỗi: "Prisma Client not generated"

```bash
cd backend
npx prisma generate
```

### Lỗi: "Module not found"

```bash
# Xóa node_modules và reinstall
cd backend
rmdir /s /q node_modules
npm install

cd ../frontend
rmdir /s /q node_modules
npm install
```

---

## 📁 Bước 10: Copy Files từ Máy Cũ (Nếu cần)

### 10.1. Database Backup

**Trên máy cũ**:
```bash
cd backend
node scripts/backup-database.js
# File tạo ra: backend/backups/database-backup-YYYY-MM-DDTHH-MM-SS.json
```

**Copy sang máy mới**:
- Copy file backup vào `backend/backups/`
- Chạy restore (xem Bước 5)

### 10.2. Uploaded Files

**Trên máy cũ**:
```bash
# Copy toàn bộ thư mục storage
# Location: backend/storage/
```

**Trên máy mới**:
```bash
# Paste vào backend/storage/
# Cấu trúc: backend/storage/{tenant_id}/{filename}
```

### 10.3. Environment Files

**Files cần copy** (nếu có custom config):
- `backend/.env`
- `frontend/.env.local`
- `license-server/.env`

⚠️ **Lưu ý**: Không commit các file `.env` lên Git!

---

## 🎯 Bước 11: Verify Setup Hoàn Tất

### Checklist

- [ ] Docker services running (Postgres + Redis)
- [ ] Backend server running (port 4000)
- [ ] Frontend server running (port 3000)
- [ ] License server running (port 5000)
- [ ] Database có data (check Prisma Studio)
- [ ] Login thành công với admin account
- [ ] Upload document thành công
- [ ] Create workflow thành công
- [ ] Submit approval thành công

### Test Full Flow

1. **Login**: `admin@acme.local` / `Admin@123`
2. **Upload Document**: Documents → Tạo mới → Upload file
3. **Create Workflow**: Workflows → Tạo mới → Add steps
4. **Submit Approval**: Documents → Trình ký → Select workflow
5. **Approve**: Approvals → Approve document

---

## 📚 Tài Liệu Tham Khảo

- **Quick Start**: `QUICK-START.md`
- **Testing Guide**: `README-TESTING.md`
- **API Documentation**: `test-api.http`
- **Architecture**: `CODE-MAP.md`
- **Development Guide**: `START-HERE-FOR-AI.md`
- **Task Checklist**: `docs/dev/TASK-CHECKLIST-GUIDE.md`
- **Agents Log**: `AGENTS.md`

---

## 🆘 Cần Trợ Giúp?

### Liên Hệ

- **GitHub Issues**: https://github.com/dinhvansh/e-office/issues
- **Documentation**: `docs/` folder
- **Session Logs**: `docs/dev/SESSION-*.md`

### Common Commands

```bash
# Start all services
.\start-all.ps1

# Stop all services
.\stop-all.ps1

# Backup database
cd backend
node scripts/backup-database.js

# Restore database
node scripts/restore-database.js <backup-file.json>

# Reset database (careful!)
npx prisma migrate reset

# View database
npx prisma studio

# Check logs
docker-compose logs -f postgres
docker-compose logs -f redis
```

---

## ✅ Kết Luận

Sau khi hoàn thành tất cả các bước trên, bạn đã có:

1. ✅ Môi trường development đầy đủ
2. ✅ Database với schema mới nhất
3. ✅ Data đầy đủ (từ backup hoặc seed)
4. ✅ Tất cả services đang chạy
5. ✅ Hệ thống sẵn sàng để develop

**Thời gian setup**: ~30-45 phút

**Next Steps**: Đọc `START-HERE-FOR-AI.md` để hiểu architecture và bắt đầu develop! 🚀
