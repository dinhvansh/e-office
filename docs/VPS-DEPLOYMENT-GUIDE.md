# VPS Deployment Guide - E-Office

> **Hướng dẫn lỗi thời.** Nội dung bên dưới chứa lệnh Compose v1 và giả định
> triển khai cũ. Dùng [`../INSTALL-PRODUCTION.md`](../INSTALL-PRODUCTION.md).

## Thông Tin VPS

- **IP**: 36.50.27.139
- **Frontend**: http://36.50.27.139:3000
- **Backend API**: http://36.50.27.139:4000

## Yêu Cầu Trên VPS

### 1. Cài Đặt Docker & Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 2. Cài Đặt Git

```bash
sudo apt install git -y
git --version
```

## Các Bước Deploy

### 1. Clone Repository

```bash
# SSH vào VPS
ssh root@36.50.27.139

# Clone project
cd /opt
git clone <your-repo-url> e-office
cd e-office
```

### 2. Cấu Hình Environment Variables

File `docker-compose.yml` đã được cấu hình sẵn cho VPS với IP `36.50.27.139`.

**Kiểm tra cấu hình:**
- Frontend: `NEXT_PUBLIC_API_URL=http://36.50.27.139:4000`
- Backend: `CORS_ORIGIN=http://36.50.27.139:3000,http://36.50.27.139`
- Backend: `NODE_ENV=production`

### 3. Mở Firewall Ports

```bash
# Nếu dùng UFW
sudo ufw allow 3000/tcp  # Frontend
sudo ufw allow 4000/tcp  # Backend API
sudo ufw allow 5432/tcp  # PostgreSQL (optional, chỉ nếu cần access từ bên ngoài)
sudo ufw allow 6379/tcp  # Redis (optional)
sudo ufw status
```

### 4. Build và Start Services

```bash
# Build và start tất cả containers
docker-compose up -d --build

# Xem logs
docker-compose logs -f

# Hoặc xem logs từng service
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f db
```

### 5. Setup Database

```bash
# Chờ containers khởi động (khoảng 30 giây)
sleep 30

# Generate Prisma client
docker-compose exec backend npx prisma generate

# Push database schema
docker-compose exec backend npx prisma migrate deploy

# Seed data
docker-compose exec backend node scripts/seed-rbac.js
docker-compose exec backend node scripts/seed-document-types.js
docker-compose exec backend node scripts/seed-workflows-simple.js
docker-compose exec backend node scripts/seed-org-final.js
```

### 6. Verify Deployment

```bash
# Check containers status
docker-compose ps

# Test backend health
curl http://36.50.27.139:4000/health

# Test frontend
curl http://36.50.27.139:3000
```

## Truy Cập Ứng Dụng

- **Frontend**: http://36.50.27.139:3000
- **Backend API**: http://36.50.27.139:4000
- **API Docs**: http://36.50.27.139:4000/api-docs (nếu có)

**Default Login:**
- Email: `admin@acme.local`
- Password: the unique value supplied through `DEMO_ADMIN_PASSWORD`

## Quản Lý Services

### Stop Services
```bash
docker-compose down
```

### Restart Services
```bash
docker-compose restart
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Update Code
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### Backup Database
```bash
# Create backup
docker-compose exec backend node scripts/backup-database.js

# Backups are stored in ./backend/backups/
```

### Restore Database
```bash
# List backups
ls -lh backend/backups/

# Restore from backup
docker-compose exec backend node scripts/restore-database.js backup-2024-12-03.sql
```

## Troubleshooting

### 1. Containers không start

```bash
# Check logs
docker-compose logs

# Check specific service
docker-compose logs backend
docker-compose logs db

# Restart services
docker-compose restart
```

### 2. Database connection error

```bash
# Check database is running
docker-compose ps db

# Check database logs
docker-compose logs db

# Verify connection
docker-compose exec backend npx prisma migrate deploy
```

### 3. Frontend không kết nối được Backend

**Kiểm tra:**
- CORS_ORIGIN trong backend có đúng không
- NEXT_PUBLIC_API_URL trong frontend có đúng không
- Firewall có mở port 4000 không

```bash
# Test backend từ VPS
curl http://localhost:4000/health

# Test backend từ bên ngoài
curl http://36.50.27.139:4000/health
```

### 4. Port đã được sử dụng

```bash
# Check ports in use
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :4000

# Kill process using port
sudo kill -9 <PID>
```

## Security Recommendations

### 1. Đổi Database Password

Sửa trong `docker-compose.yml`:
```yaml
db:
  environment:
    POSTGRES_PASSWORD: <strong-password-here>

backend:
  environment:
    DATABASE_URL: postgresql://eoffice:<strong-password-here>@db:5432/eoffice_db
```

### 2. Đổi JWT Secrets

Sửa trong `docker-compose.yml`:
```yaml
backend:
  environment:
    JWT_SECRET: <generate-random-32-chars>
    REFRESH_TOKEN_SECRET: <generate-random-32-chars>
```

Generate secrets:
```bash
node backend/scripts/generate-jwt-secrets.js
```

### 3. Setup HTTPS với Nginx + Let's Encrypt

```bash
# Install Nginx
sudo apt install nginx -y

# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate (cần domain name)
sudo certbot --nginx -d yourdomain.com
```

### 4. Restrict Database Port

Trong `docker-compose.yml`, xóa hoặc comment port mapping của database:
```yaml
db:
  # ports:
  #   - "5432:5432"  # Không expose ra ngoài
```

### 5. Setup Firewall

```bash
# Only allow necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 3000/tcp # Frontend
sudo ufw allow 4000/tcp # Backend
sudo ufw enable
```

## Monitoring

### Check Resource Usage

```bash
# Docker stats
docker stats

# Disk usage
df -h
docker system df

# Memory usage
free -h
```

### View Application Logs

```bash
# Real-time logs
docker-compose logs -f --tail=100

# Save logs to file
docker-compose logs > logs.txt
```

## Maintenance

### Clean Up Docker

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove unused containers
docker container prune

# Clean everything
docker system prune -a --volumes
```

### Update Dependencies

```bash
# Pull latest code
git pull origin main

# Rebuild with no cache
docker-compose build --no-cache

# Restart services
docker-compose up -d
```

## Production Checklist

- [ ] Database password đã đổi
- [ ] JWT secrets đã đổi
- [ ] Firewall đã cấu hình
- [ ] Database port không expose ra ngoài
- [ ] CORS_ORIGIN đã cấu hình đúng
- [ ] NODE_ENV=production
- [ ] Backup database định kỳ
- [ ] Monitoring logs
- [ ] SSL certificate (nếu có domain)

## Support

Nếu gặp vấn đề, check:
1. Logs: `docker-compose logs -f`
2. Container status: `docker-compose ps`
3. Network: `docker network ls`
4. Volumes: `docker volume ls`

---

**Last Updated**: 2025-12-03
**VPS IP**: 36.50.27.139
