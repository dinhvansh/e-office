# 🚀 E-Office Quick Start Guide

## Cài Đặt Tự Động (Khuyến Nghị)

### Trên VPS Ubuntu/Debian

```bash
# 1. Clone repository
git clone https://github.com/your-repo/e-office.git
cd e-office

# 2. Chạy auto setup script
bash auto-setup.sh
```

**Chỉ vậy thôi!** Script sẽ tự động:
- ✅ Cài đặt Docker & Docker Compose
- ✅ Tạo environment files với secrets tự động
- ✅ Build Docker images
- ✅ Khởi động tất cả services
- ✅ Setup database và seed data
- ✅ Tạo file credentials để backup

### Sau Khi Setup

1. **Truy cập ứng dụng**: `http://YOUR_VPS_IP:3000`
2. **Đăng nhập**:
   - Email: `admin@acme.local`
   - Password: the unique value supplied through `DEMO_ADMIN_PASSWORD`
3. **Đổi password ngay lập tức**
4. **Backup file `.credentials.txt`** và xóa nó

## Cài Đặt Thủ Công

Nếu muốn kiểm soát từng bước:

### 1. Cài Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
sudo apt install docker-compose-plugin -y
```

### 2. Tạo Environment Files

```bash
# Copy templates
cp .env.production.example .env
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

# Edit với thông tin thực
nano .env
nano backend/.env
nano frontend/.env.local
```

### 3. Build và Start

```bash
docker compose build --no-cache
docker compose up -d
```

### 4. Setup Database

```bash
# Wait for services
sleep 30

# Run migrations
docker exec eoffice-backend npx prisma migrate deploy

# Seed data
docker exec eoffice-backend node scripts/seed.js
docker exec eoffice-backend node scripts/seed-rbac.js
docker exec eoffice-backend node scripts/seed-document-types.js
docker exec eoffice-backend node scripts/seed-workflows-simple.js
```

## Các Lệnh Thường Dùng

```bash
# Xem logs
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend

# Restart services
docker compose restart
docker compose restart backend

# Stop services
docker compose down

# Rebuild
docker compose up -d --build

# Check status
docker compose ps

# Access container shell
docker exec -it eoffice-backend sh
docker exec -it eoffice-frontend sh
```

## Troubleshooting

### Services không start

```bash
# Check logs
docker compose logs

# Check specific service
docker compose logs backend

# Restart
docker compose restart
```

### Database connection error

```bash
# Check database is running
docker compose ps db

# Check connection from backend
docker exec eoffice-backend npx prisma db pull
```

### Frontend không kết nối Backend

```bash
# Check NEXT_PUBLIC_API_BASE_URL
docker exec eoffice-frontend env | grep NEXT_PUBLIC

# Rebuild frontend nếu sai
docker compose build --no-cache frontend
docker compose up -d frontend
```

### Email không gửi được

```bash
# Test email config
docker exec eoffice-backend node scripts/test-email-production.js

# Check logs
docker compose logs backend | grep -i smtp
```

## Cấu Hình Nâng Cao

### Sử dụng Domain

1. Point domain A record đến VPS IP
2. Update `.env`:
   ```bash
   FRONTEND_URL=https://yourdomain.com
   BACKEND_URL=https://api.yourdomain.com
   NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api/v1
   CORS_ORIGIN=https://yourdomain.com
   ```
3. Setup Nginx reverse proxy (xem docs/VPS-DEPLOYMENT-GUIDE.md)
4. Setup SSL với Let's Encrypt

### Cấu Hình Email

Edit `backend/.env`:

```bash
# Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Outlook
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password

# SendGrid
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

Sau đó restart backend:
```bash
docker compose restart backend
```

## Security Checklist

- [ ] Đổi password admin mặc định
- [ ] Generate JWT secrets mới (không dùng example values)
- [ ] Cấu hình firewall
- [ ] Setup SSL certificates
- [ ] Backup `.credentials.txt` và xóa nó
- [ ] Không commit `.env` files vào git
- [ ] Sử dụng strong database password
- [ ] Cấu hình SMTP với app-specific password

## Backup & Restore

### Backup Database

```bash
# Manual backup
docker exec eoffice-db pg_dump -U eoffice_user eoffice_prod > backup.sql

# Backup storage
tar -czf storage-backup.tar.gz storage/
```

### Restore Database

```bash
# Restore from backup
cat backup.sql | docker exec -i eoffice-db psql -U eoffice_user eoffice_prod

# Restore storage
tar -xzf storage-backup.tar.gz
```

## Update Code

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose up -d --build

# Run new migrations if any
docker exec eoffice-backend npx prisma migrate deploy
```

## Monitoring

### Health Checks

```bash
# Backend health
curl http://localhost:4000/health

# Check all containers
docker compose ps

# Resource usage
docker stats
```

### Logs

```bash
# Follow all logs
docker compose logs -f

# Last 100 lines
docker compose logs --tail=100

# Specific service
docker compose logs -f backend
```

## Support

- 📚 Documentation: `docs/`
- 🐳 Docker Guide: `docs/docker/`
- 🚀 VPS Deployment: `docs/VPS-DEPLOYMENT-GUIDE.md`
- 🔒 Security: `SECURITY-CHECKLIST.md`

## License

[Your License]
