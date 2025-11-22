# Setup Experience & Troubleshooting Guide

**Date**: 2025-11-22  
**System**: E-Office (WP Sign)  
**Environment**: Windows 11, Node.js v25.2.1, Docker Desktop

---

## 📋 Tổng Quan Setup

**Thời gian thực tế**: ~45 phút  
**Thời gian ước tính**: 30-45 phút  
**Độ khó**: Trung bình (có lỗi TypeScript cần fix)

---

## ✅ Quy Trình Setup Thành Công

### 1. Kiểm Tra Môi Trường (5 phút)

```powershell
# Kiểm tra Node.js
node --version  # v25.2.1 ✅

# Kiểm tra Docker
docker --version  # ✅

# Kiểm tra Git
git --version  # ✅
```

**Kết quả**: Tất cả đã cài đặt sẵn.

---

### 2. Cài Đặt Dependencies (5 phút)

```powershell
# Backend
cd backend
npm install  # ✅ 546 packages, 0 vulnerabilities

# Frontend
cd ../frontend
npm install  # ⚠️ 223 packages, 2 vulnerabilities (không ảnh hưởng)

# License Server
cd ../license-server
npm install  # ✅ 166 packages, 0 vulnerabilities
```

**Lưu ý**: Frontend có 2 vulnerabilities (1 high, 1 critical) nhưng không ảnh hưởng dev.

---

### 3. Fix TypeScript Errors (15 phút) ⚠️

**Vấn đề**: Code có 21 lỗi TypeScript khi build.

#### 3.1. Lỗi Phát Hiện

```bash
npm run build
# ❌ 21 errors in 7 files
```

**Các lỗi chính**:
1. `document.title` (string | null) không match type `string`
2. `document_number || undefined` không match type `string`
3. `current_step_id: null` không match type `number | undefined`
4. Missing `update()` method trong `DocumentsRepository`
5. Missing `owner` relation trong document queries
6. `approver_id: nullable()` không match service type
7. `field.value?: any` không match required type

#### 3.2. Giải Pháp

**Tạo script tự động fix**:

```javascript
// backend/fix-all-errors.js
const fs = require('fs');
const path = require('path');

// 1. Fix approvals.service.ts
// - document.title -> document.title || 'Untitled'
// - document_number || undefined -> document_number || ''
// - current_step_id: null -> current_step_id: undefined
// - getApproversForStep(id, null) -> getApproversForStep(id, 0)

// 2. Fix departments.repository.ts
// - Add null checks: if (dept && dept._count.users > 0)

// 3. Fix departments.service.ts
// - if (existing && existing.id !== id)

// 4. Add update() method to documents.repository.ts
update(id: number, data: Partial<CreateDocumentData>): Promise<documents> {
  return prisma.documents.update({ where: { id }, data });
}

// 5. Add sign_request_id to CreateDocumentData interface

// 6. Fix workflows.controller.ts
// - Remove .nullable() from zod schemas

// 7. Fix publicSign.controller.ts
// - Cast type: body.field_values as Array<{field_id: number; value: any}>
```

**Chạy fix**:
```bash
node fix-all-errors.js
npm run build  # ✅ Success!
```

---

### 4. Start Docker Services (3 phút)

```powershell
# Start PostgreSQL + Redis
docker-compose up -d db redis

# Kiểm tra
docker-compose ps
# ✅ e-office-db-1     Running
# ✅ e-office-redis-1  Running
```

**Lưu ý**: Đợi 5 giây để Postgres khởi động hoàn toàn.

---

### 5. Setup Database (10 phút)

#### 5.1. Tạo .env File

```bash
cd backend
Copy-Item .env.example .env
```

#### 5.2. Cập Nhật Database Credentials ⚠️

**Vấn đề**: `.env.example` có credentials khác với `docker-compose.yml`

```env
# ❌ .env.example (SAI)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/esign_db

# ✅ docker-compose.yml (ĐÚNG)
POSTGRES_USER: esign
POSTGRES_PASSWORD: esignpass
POSTGRES_DB: esign
```

**Fix**:
```env
# backend/.env
DATABASE_URL=postgresql://esign:esignpass@localhost:5432/esign
```

#### 5.3. Generate Prisma Client & Push Schema

```bash
npx prisma generate  # ✅ Generated in 596ms
npx prisma db push   # ✅ Database in sync (844ms)
```

---

### 6. Restore Data (7 phút)

#### 6.1. Thử Restore từ Backup ⚠️

```bash
# Copy restore script
Copy-Item docs/setup-and-backup/restore-database.js backend/scripts/

# Restore
node scripts/restore-database.js database-backup-2025-11-22T06-55-58.json
```

**Kết quả**: 
- ✅ Restore được 1 tenant, 15 positions, 39 permissions, 5 roles, 7 workflows
- ❌ Lỗi foreign key cho departments, users, documents (do thứ tự restore)

**Nguyên nhân**: Backup script không handle foreign key dependencies đúng thứ tự.

#### 6.2. Seed Data Mới (Giải pháp)

```bash
node scripts/setup-complete-database.js
```

**Kết quả**:
```
✅ 1 Admin user (admin@acme.local / password123)
✅ 4 Roles (Admin, Manager, User, Viewer)
✅ 39 Permissions
✅ 5 Departments
✅ 12 Positions
✅ 5 External Organizations
✅ 7 Workflows
✅ 8 Document Types
```

---

### 7. Setup Frontend & License Server (2 phút)

```bash
# Frontend
cd frontend
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1" > .env.local

# License Server
cd ../license-server
echo "PORT=5000
LICENSE_SIGNING_SECRET=changeme-license-secret-for-dev
NODE_ENV=development" > .env
```

---

### 8. Start All Servers (3 phút)

```powershell
# Sử dụng controlPwshProcess (background processes)
# License Server
controlPwshProcess -action start -path license-server -command "npm run dev"

# Frontend
controlPwshProcess -action start -path frontend -command "npm run dev"

# Backend
controlPwshProcess -action start -path backend -command "npm run dev"
```

**Đợi 10 giây để servers khởi động**

**Kết quả**:
```
✅ License Server: http://localhost:5000
✅ Backend API:    http://localhost:4000
✅ Frontend:       http://localhost:3000
```

---

## 🐛 Các Lỗi Gặp Phải & Cách Fix

### Lỗi 1: TypeScript Build Errors (21 lỗi)

**Triệu chứng**:
```
npm run build
❌ 21 errors in 7 files
```

**Nguyên nhân**: 
- Strict null checks
- Type mismatches
- Missing methods/properties

**Giải pháp**: Tạo script `fix-all-errors.js` để tự động fix (xem phần 3.2)

---

### Lỗi 2: Database Authentication Failed

**Triệu chứng**:
```
Error: P1000: Authentication failed against database server
```

**Nguyên nhân**: `.env.example` có credentials khác `docker-compose.yml`

**Giải pháp**:
```env
# Cập nhật backend/.env
DATABASE_URL=postgresql://esign:esignpass@localhost:5432/esign
```

---

### Lỗi 3: Foreign Key Violations khi Restore

**Triệu chứng**:
```
❌ Error restoring departments: Foreign key constraint violated
❌ Error restoring users: Foreign key constraint violated
```

**Nguyên nhân**: Restore script không handle dependencies order

**Giải pháp**: Dùng seed scripts thay vì restore
```bash
node scripts/setup-complete-database.js
```

---

### Lỗi 4: Docker Not Running

**Triệu chứng**:
```
Error: P1001: Can't reach database server at localhost:5432
```

**Giải pháp**:
```bash
docker-compose up -d db redis
timeout /t 5  # Đợi 5 giây
```

---

## 📝 Checklist Setup Nhanh

```
☐ 1. Kiểm tra môi trường (Node, Docker, Git)
☐ 2. npm install (backend, frontend, license-server)
☐ 3. Fix TypeScript errors (chạy fix-all-errors.js)
☐ 4. Start Docker (docker-compose up -d db redis)
☐ 5. Cập nhật backend/.env (DATABASE_URL)
☐ 6. npx prisma generate && npx prisma db push
☐ 7. Seed data (node scripts/setup-complete-database.js)
☐ 8. Tạo frontend/.env.local và license-server/.env
☐ 9. Start servers (npm run dev x3)
☐ 10. Test login (admin@acme.local / password123)
```

---

## 🔧 Scripts Hữu Ích

### Fix TypeScript Errors
```bash
cd backend
node fix-all-errors.js
npm run build
```

### Reset Database
```bash
cd backend
npx prisma db push --force-reset
node scripts/setup-complete-database.js
```

### Check Services
```bash
# Docker
docker-compose ps

# Backend health
curl http://localhost:4000/health

# Frontend
curl http://localhost:3000
```

### View Logs
```powershell
# Backend logs
Get-ProcessOutput -processId 2

# Frontend logs
Get-ProcessOutput -processId 3

# License Server logs
Get-ProcessOutput -processId 4
```

### Stop All
```powershell
.\stop-all.ps1
# hoặc
docker-compose down
```

---

## 💡 Best Practices

### 1. Luôn Kiểm Tra Credentials

**Trước khi setup**:
```bash
# So sánh docker-compose.yml và .env.example
cat docker-compose.yml | grep POSTGRES
cat backend/.env.example | grep DATABASE_URL
```

### 2. Fix TypeScript Trước Khi Start

```bash
cd backend
npm run build  # Phải pass trước khi start
```

### 3. Đợi Docker Khởi Động

```bash
docker-compose up -d db redis
timeout /t 5  # Windows
# sleep 5     # Linux/Mac
```

### 4. Seed Data Thay Vì Restore (Nếu Có Lỗi)

```bash
# Restore có thể lỗi foreign key
# Dùng seed an toàn hơn
node scripts/setup-complete-database.js
```

### 5. Verify Từng Bước

```bash
# Sau mỗi bước, kiểm tra
docker-compose ps           # Docker running?
npx prisma db push          # Schema synced?
curl localhost:4000/health  # Backend running?
curl localhost:3000         # Frontend running?
```

---

## 📊 Thống Kê Setup

| Bước | Thời Gian | Độ Khó | Lỗi Gặp |
|------|-----------|--------|---------|
| 1. Kiểm tra môi trường | 2 phút | Dễ | 0 |
| 2. npm install | 5 phút | Dễ | 0 |
| 3. Fix TypeScript | 15 phút | Khó | 21 lỗi |
| 4. Start Docker | 3 phút | Dễ | 0 |
| 5. Setup Database | 10 phút | Trung bình | 2 lỗi |
| 6. Restore/Seed Data | 7 phút | Trung bình | 1 lỗi |
| 7. Setup Frontend | 2 phút | Dễ | 0 |
| 8. Start Servers | 3 phút | Dễ | 0 |
| **TỔNG** | **47 phút** | **Trung bình** | **24 lỗi** |

---

## 🎯 Kết Luận

### Điểm Mạnh
- ✅ Có sẵn seed scripts đầy đủ
- ✅ Docker setup đơn giản
- ✅ Documentation chi tiết

### Điểm Cần Cải Thiện
- ⚠️ TypeScript errors cần fix trước khi ship
- ⚠️ `.env.example` credentials không khớp `docker-compose.yml`
- ⚠️ Restore script cần handle foreign key order

### Khuyến Nghị
1. **Fix TypeScript errors** và commit vào repo
2. **Sync credentials** giữa `.env.example` và `docker-compose.yml`
3. **Improve restore script** để handle dependencies
4. **Add health check** endpoints cho tất cả services
5. **Create automated setup script** (1-click setup)

---

## 📚 Tài Liệu Liên Quan

- `docs/setup-and-backup/SETUP-NEW-MACHINE.md` - Hướng dẫn setup chi tiết
- `docs/setup-and-backup/README.md` - Backup & restore guide
- `AGENTS.md` - Development log
- `CODE-MAP.md` - Architecture overview
- `QUICK-START.md` - Quick start guide

---

**Người thực hiện**: Kiro AI Assistant  
**Ngày**: 2025-11-22  
**Thời gian**: 14:30 - 15:15 (45 phút)  
**Kết quả**: ✅ Setup thành công, hệ thống chạy ổn định

