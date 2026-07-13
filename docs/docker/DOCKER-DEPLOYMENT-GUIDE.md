# Docker Deployment Guide - Hướng dẫn Deploy với Docker

## 📋 Yêu cầu hệ thống

### Máy Windows
- Windows 10/11 Pro, Enterprise, hoặc Education (64-bit)
- WSL 2 enabled
- Docker Desktop for Windows
- Ít nhất 8GB RAM (khuyến nghị 16GB)
- 20GB disk space trống

### Máy Linux
- Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- Docker Engine 20.10+
- Docker Compose v2.0+
- Ít nhất 4GB RAM
- 20GB disk space trống

### Máy Mac
- macOS 11+ (Big Sur hoặc mới hơn)
- Docker Desktop for Mac
- Ít nhất 8GB RAM
- 20GB disk space trống

## 🚀 Cài đặt Docker

### Windows
1. Download Docker Desktop: https://www.docker.com/products/docker-desktop
2. Cài đặt và khởi động Docker Desktop
3. Đảm bảo WSL 2 được enable
4. Kiểm tra: `docker --version` và `docker-compose --version`

### Linux (Ubuntu/Debian)
```bash
# Update packages
sudo apt-get update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo apt-get install docker-compose-plugin

# Verify
docker --version
docker compose version
```

### Mac
1. Download Docker Desktop: https://www.docker.com/products/docker-desktop
2. Cài đặt và khởi động Docker Desktop
3. Kiểm tra: `docker --version` và `docker-compose --version`

## 📦 Chuẩn bị Project

### 1. Clone hoặc copy project
```bash
# Nếu có Git repository
git clone <repository-url>
cd e-office

# Hoặc copy folder từ máy khác
# Đảm bảo có đầy đủ các file:
# - docker-compose.yml
# - backend/Dockerfile
# - frontend/Dockerfile
# - license-server/Dockerfile
```

### 2. Tạo environment files

**Backend (.env)**
```bash
cd backend
cp .env.example .env
```

Sửa file `backend/.env`:
```env
# Database (sử dụng Docker service name)
DATABASE_URL=postgres://esign:esignpass@db:5432/esign

# JWT Secrets (QUAN TRỌNG: Đổi trong production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
REFRESH_TOKEN_SECRET=your-super-secret-refresh-key-change-this-in-production

# Redis
REDIS_URL=redis://redis:6379

# License Server
LICENSE_SERVER_URL=http://license-server:5000/api/v1

# Email (optional - cấu hình nếu cần gửi email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourcompany.com

# CORS (thêm domain của bạn)
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com
```

**Frontend (.env.local)**
```bash
cd ../frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
```

Nếu deploy lên server với domain:
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## 🏗️ Build và Start

### Cách 1: Sử dụng script tự động (Khuyến nghị)

**Windows:**
```powershell
.\docker-quick-test.ps1
```

**Linux/Mac:**
```bash
chmod +x docker-quick-test.sh
./docker-quick-test.sh
```

### Cách 2: Manual commands

```bash
# 1. Stop containers cũ (nếu có)
docker-compose down

# 2. Build images (lần đầu mất 5-10 phút)
docker-compose build

# 3. Start services
docker-compose up -d

# 4. Xem logs để đảm bảo services đã start
docker-compose logs -f

# 5. Đợi backend ready (Ctrl+C để thoát logs)
# Khi thấy "Backend listening on port 4000" là OK

# 6. Setup database
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend node scripts/seed-rbac.js
docker-compose exec backend node scripts/seed-document-types.js
docker-compose exec backend node scripts/seed-workflows-simple.js
docker-compose exec backend node scripts/seed-org-final.js

# 7. Kiểm tra status
docker-compose ps
```

## ✅ Kiểm tra

### 1. Check services
```bash
# Tất cả containers phải có status "Up" và "healthy"
docker-compose ps
```

Expected output:
```
NAME                 STATUS              PORTS
eoffice-backend      Up (healthy)        0.0.0.0:4000->4000/tcp
eoffice-db           Up (healthy)        0.0.0.0:5432->5432/tcp
eoffice-frontend     Up                  0.0.0.0:3000->3000/tcp
eoffice-license      Up                  0.0.0.0:5000->5000/tcp
eoffice-redis        Up (healthy)        0.0.0.0:6379->6379/tcp
```

### 2. Test endpoints
```bash
# Backend health check
curl http://localhost:4000/health

# Frontend
curl http://localhost:3000
```

### 3. Test login
1. Mở browser: http://localhost:3000
2. Login với:
   - Email: `admin@acme.local`
   - Password: `admin123`
3. Nếu login thành công → Setup OK!

## 🔧 Troubleshooting

### Lỗi: Port already in use
```bash
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :4000

# Linux/Mac
lsof -i :3000
lsof -i :4000

# Giải pháp: Stop service đang dùng port hoặc đổi port trong docker-compose.yml
```

### Lỗi: Docker Desktop not running
```
Error: Cannot connect to Docker daemon
```
**Giải pháp:** Mở Docker Desktop và đợi nó start xong

### Lỗi: Build failed - Out of memory
```
Error: JavaScript heap out of memory
```
**Giải pháp:**
1. Mở Docker Desktop
2. Settings → Resources → Memory
3. Tăng lên 4GB hoặc 6GB
4. Apply & Restart
5. Build lại: `docker-compose build`

### Lỗi: Database connection failed
```bash
# Kiểm tra DB logs
docker-compose logs db

# Restart DB
docker-compose restart db

# Nếu vẫn lỗi, xóa volume và tạo lại
docker-compose down -v
docker-compose up -d
```

### Lỗi: Backend không start
```bash
# Xem logs chi tiết
docker-compose logs backend

# Thường do:
# 1. Database chưa ready → Đợi thêm 10-20 giây
# 2. Prisma client chưa generate → Vào container và chạy:
docker-compose exec backend npx prisma generate
docker-compose restart backend
```

### Lỗi: Frontend build failed
```bash
# Xem logs chi tiết
docker-compose logs frontend

# Thường do thiếu NEXT_PUBLIC_API_URL
# Kiểm tra file frontend/.env.local
```

## 🎯 Production Deployment

### 1. Tạo docker-compose.prod.yml
```yaml
version: "3.9"

services:
  db:
    image: postgres:16
    container_name: eoffice-db-prod
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - db_data:/var/lib/postgresql/data
    restart: always
    networks:
      - eoffice-network

  redis:
    image: redis:7-alpine
    container_name: eoffice-redis-prod
    restart: always
    networks:
      - eoffice-network

  backend:
    build: 
      context: ./backend
      target: production
    container_name: eoffice-backend-prod
    environment:
      DATABASE_URL: postgres://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
      JWT_SECRET: ${JWT_SECRET}
      REFRESH_TOKEN_SECRET: ${REFRESH_TOKEN_SECRET}
      NODE_ENV: production
    volumes:
      - ./storage:/app/storage
      - ./backups:/app/backups
    restart: always
    networks:
      - eoffice-network
    depends_on:
      - db
      - redis

  frontend:
    build:
      context: ./frontend
      target: production
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    container_name: eoffice-frontend-prod
    restart: always
    networks:
      - eoffice-network
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    container_name: eoffice-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    restart: always
    networks:
      - eoffice-network
    depends_on:
      - frontend
      - backend

volumes:
  db_data:

networks:
  eoffice-network:
    driver: bridge
```

### 2. Tạo .env.prod
```env
# Database
DB_USER=esign_prod
DB_PASSWORD=<strong-password-here>
DB_NAME=esign_prod

# JWT (PHẢI ĐỔI!)
JWT_SECRET=<generate-strong-secret-here>
REFRESH_TOKEN_SECRET=<generate-strong-secret-here>

# API URL
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### 3. Deploy
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Setup database
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
docker-compose -f docker-compose.prod.yml exec backend node scripts/seed-rbac.js
```

## 📊 Monitoring

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Check resource usage
```bash
docker stats
```

### Backup database
```bash
# Backup
docker-compose exec db pg_dump -U esign esign > backup-$(date +%Y%m%d).sql

# Restore
cat backup-20231203.sql | docker-compose exec -T db psql -U esign esign
```

## 🛑 Stop và Clean

```bash
# Stop services
docker-compose down

# Stop và xóa volumes (XÓA DATA!)
docker-compose down -v

# Stop và xóa images
docker-compose down --rmi all

# Clean everything (XÓA TẤT CẢ!)
docker system prune -a --volumes
```

## 📝 Checklist Deploy lên máy mới

- [ ] Docker Desktop/Engine đã cài và chạy
- [ ] Clone/copy project về máy
- [ ] Tạo file `backend/.env` với config đúng
- [ ] Tạo file `frontend/.env.local`
- [ ] Build images: `docker-compose build`
- [ ] Start services: `docker-compose up -d`
- [ ] Đợi services ready (check logs)
- [ ] Setup database (prisma + seeds)
- [ ] Test login tại http://localhost:3000
- [ ] Test tạo document
- [ ] Test approval flow
- [ ] Test sign request

## 🆘 Support

Nếu gặp vấn đề:
1. Check logs: `docker-compose logs -f`
2. Check container status: `docker-compose ps`
3. Restart service: `docker-compose restart <service-name>`
4. Rebuild: `docker-compose build --no-cache <service-name>`
5. Xem file `docker-test.md` để biết thêm chi tiết
