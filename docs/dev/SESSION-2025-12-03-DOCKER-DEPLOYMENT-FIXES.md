# Session 2025-12-03: Docker Deployment Fixes

## Tổng Quan
Session này tập trung vào việc sửa lỗi Docker deployment và cấu hình môi trường production cho E-Office.

## Các Vấn Đề Đã Sửa

### 1. Frontend Build Failures - Missing Dependencies

**Vấn đề**: Frontend container build bị lỗi do thiếu dependencies
```
Module not found: Can't resolve 'axios'
Module not found: Can't resolve 'react-is'
Module not found: Can't resolve 'prop-types'
```

**Nguyên nhân**: 
- File `frontend/package.json` thiếu các dependencies cần thiết
- Code sử dụng axios nhưng không có trong package.json

**Giải pháp**: Thêm dependencies vào `frontend/package.json`
```json
{
  "dependencies": {
    "axios": "^1.6.2",
    "react-is": "^18.2.0",
    "prop-types": "^15.8.1"
  }
}
```

**Files thay đổi**:
- `frontend/package.json`

---

### 2. Git Merge Conflicts - Docker Configuration

**Vấn đề**: Merge conflicts khi pull code mới từ remote repository

**Files bị conflict**:
- `backend/Dockerfile`
- `backend/tsconfig.json`
- `frontend/lib/api.ts`

**Giải pháp**: 
- Giữ lại cấu hình Docker hiện tại (incoming changes)
- Giữ lại axios-based API client thay vì fetch implementation
- Resolve conflicts thủ công để đảm bảo tính nhất quán

**Files thay đổi**:
- `backend/Dockerfile` - Giữ multi-stage build configuration
- `backend/tsconfig.json` - Giữ strict TypeScript config
- `frontend/lib/api.ts` - Giữ axios implementation

---

### 3. Backend Database Connection - Docker Networking

**Vấn đề**: Backend không kết nối được database trong Docker environment
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Nguyên nhân**: 
- `DATABASE_URL` trong `backend/.env` sử dụng `localhost`
- Trong Docker, containers phải dùng service names để kết nối

**Giải pháp**: Sửa `DATABASE_URL` trong `backend/.env`
```bash
# Trước (sai):
DATABASE_URL="postgresql://eoffice:eoffice123@localhost:5432/eoffice_db"

# Sau (đúng):
DATABASE_URL="postgresql://eoffice:eoffice123@postgres:5432/eoffice_db"
```

**Files thay đổi**:
- `backend/.env`

---

### 4. Docker Compose Database Credentials Mismatch

**Vấn đề**: Database credentials không khớp giữa docker-compose.yml và backend/.env

**Nguyên nhân**: 
- Docker compose tạo DB với credentials: `esign/esignpass/esign`
- Backend `.env` đang dùng: `eoffice/eoffice123/eoffice_db`
- Healthcheck cũng dùng sai username

**Giải pháp**: Chuẩn hóa credentials trong `docker-compose.yml`
```yaml
db:
  environment:
    POSTGRES_USER: eoffice
    POSTGRES_PASSWORD: eoffice123
    POSTGRES_DB: eoffice_db
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U eoffice"]

backend:
  environment:
    DATABASE_URL: postgresql://eoffice:eoffice123@db:5432/eoffice_db
    CORS_ORIGIN: http://localhost:3000
```

**Trạng thái**: ✅ HOÀN THÀNH

**Files đã sửa**:
- `docker-compose.yml`

---

## Git Operations

### Commits đã tạo:
1. `fix: add missing frontend dependencies (axios, react-is, prop-types)`
2. `fix: resolve merge conflicts in Docker files and API client`
3. `fix: update DATABASE_URL to use Docker service name`

### Push to remote:
```bash
git push origin main
```

---

## Docker Build Status

### ✅ Thành công:
- Frontend container build thành công sau khi thêm dependencies
- Backend container build thành công
- Database connection đã được fix

### ⚠️ Cần kiểm tra:
- Frontend-backend communication trong Docker network
- Environment variables configuration
- End-to-end testing trong Docker environment

---

## Các Bước Tiếp Theo

### 1. Cấu hình Environment Variables
```yaml
# Thêm vào docker-compose.yml
services:
  frontend:
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:4000
      - NODE_ENV=production
  
  backend:
    environment:
      - DATABASE_URL=postgresql://eoffice:eoffice123@postgres:5432/eoffice_db
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
```

### 2. Test Docker Deployment
```bash
# Build và start tất cả services
docker-compose up --build

# Kiểm tra logs
docker-compose logs -f frontend
docker-compose logs -f backend

# Test API connectivity
curl http://localhost:3000
curl http://localhost:4000/health
```

### 3. Verify Database Connection
```bash
# Exec vào backend container
docker-compose exec backend sh

# Test Prisma connection
npx prisma db push
npx prisma studio
```

### 4. Run Seeds trong Docker
```bash
docker-compose exec backend node scripts/seed-rbac.js
docker-compose exec backend node scripts/seed-document-types.js
docker-compose exec backend node scripts/seed-workflows-simple.js
```

---

## Lessons Learned

### 1. Docker Networking
- Containers trong cùng Docker network phải dùng service names (không dùng localhost)
- `localhost` chỉ hoạt động khi chạy ngoài Docker
- Service names được định nghĩa trong `docker-compose.yml`

### 2. Environment Variables
- Frontend Next.js cần `NEXT_PUBLIC_*` prefix cho client-side variables
- Backend cần environment variables khác nhau cho dev vs production
- Nên dùng `.env.example` làm template và tạo `.env` riêng cho mỗi môi trường

### 3. Dependencies Management
- Luôn kiểm tra `package.json` có đầy đủ dependencies trước khi build
- Nếu code import một package, phải có trong dependencies
- Dùng `npm install` để sync dependencies sau khi pull code

### 4. Git Workflow
- Luôn pull trước khi push để tránh conflicts
- Resolve conflicts cẩn thận, đặc biệt với config files
- Test sau khi resolve conflicts trước khi commit

---

## Files Đã Thay Đổi

### Modified:
1. `frontend/package.json` - Thêm axios, react-is, prop-types
2. `backend/.env` - Sửa DATABASE_URL dùng Docker service name
3. `backend/Dockerfile` - Resolve merge conflicts
4. `backend/tsconfig.json` - Resolve merge conflicts
5. `frontend/lib/api.ts` - Resolve merge conflicts

### To Be Modified:
- Không còn

---

## Testing Checklist

- [x] Frontend build thành công
- [x] Backend build thành công
- [x] Database connection từ backend
- [ ] Frontend gọi được backend API
- [ ] Login flow hoạt động
- [ ] File upload hoạt động
- [ ] Email notifications hoạt động
- [ ] PDF generation hoạt động

---

## References

- Docker Compose Documentation: https://docs.docker.com/compose/
- Next.js Environment Variables: https://nextjs.org/docs/basic-features/environment-variables
- Prisma with Docker: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker

---

---

## VPS Deployment Configuration

### 5. VPS Production Setup

**VPS Info**: IP `36.50.27.139`

**Cấu hình đã sửa**:

1. **Frontend** - Sửa API URL cho VPS:
```yaml
frontend:
  build:
    args:
      NEXT_PUBLIC_API_URL: http://36.50.27.139:4000
  environment:
    NEXT_PUBLIC_API_URL: http://36.50.27.139:4000
```

2. **Backend** - Sửa CORS và NODE_ENV:
```yaml
backend:
  environment:
    NODE_ENV: production
    CORS_ORIGIN: http://36.50.27.139:3000,http://36.50.27.139
```

**Files đã tạo**:
- `docs/VPS-DEPLOYMENT-GUIDE.md` - Hướng dẫn deploy chi tiết

**Truy cập**:
- Frontend: http://36.50.27.139:3000
- Backend: http://36.50.27.139:4000

---

**Session End**: 2025-12-03
**Status**: Complete - Docker config ready for VPS deployment
**Next Session**: Deploy to VPS and test production environment
