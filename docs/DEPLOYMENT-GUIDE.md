# 🚀 Deployment Guide - VPS Production

Hướng dẫn deploy E-Office lên VPS production với Docker.

---

## 📋 Prerequisites

### VPS Requirements
- **OS**: Ubuntu 20.04+ hoặc Debian 11+
- **RAM**: Tối thiểu 4GB (khuyến nghị 8GB+)
- **CPU**: 2 cores trở lên
- **Storage**: 50GB+ (tùy số lượng documents)
- **Domain**: Đã trỏ DNS về VPS IP

### Software cần cài
- Docker 24+
- Docker Compose 2.0+
- Nginx (reverse proxy)
- Certbot (SSL certificate)

---

## 🔧 Step 1: Chuẩn bị VPS

### 1.1. SSH vào VPS
```bash
ssh root@your-vps-ip
```

### 1.2. Update system
```bash
apt update && apt upgrade -y
```

### 1.3. Cài Docker
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Verify
docker --version
docker compose version
```

### 1.4. Cài Nginx
```bash
apt install nginx -y
systemctl enable nginx
systemctl start nginx
```

### 1.5. Cài Certbot (SSL)
```bash
apt install certbot python3-certbot-nginx -y
```

---

## 📦 Step 2: Clone & Setup Project

### 2.1. Clone repository
```bash
cd /opt
git clone https://github.com/dinhvansh/e-office.git
cd e-office
```

### 2.2. Tạo production environment files

**Backend `.env`**:
```bash
cd backend
cp .env.example .env
nano .env
```

Cập nhật các giá trị production:
```env
# Database
DATABASE_URL="postgresql://eoffice_user:STRONG_PASSWORD_HERE@postgres:5432/eoffice_prod"

# JWT
JWT_SECRET="GENERATE_STRONG_SECRET_HERE"
JWT_EXPIRES_IN="7d"

# Server
NODE_ENV="production"
PORT=4000
CORS_ORIGIN="https://yourdomain.com"

# Redis
REDIS_URL="redis://redis:6379"

# Email (Gmail example)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="E-Office <your-email@gmail.com>"

# File Storage
STORAGE_PATH="/app/storage"
MAX_FILE_SIZE=26214400

# License
LICENSE_SERVER_URL="http://license-server:3001"
```

**Frontend `.env.local`**:
```bash
cd ../frontend
cp .env.example .env.local
nano .env.local
```

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### 2.3. Generate JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 🐳 Step 3: Docker Production Setup

### 3.1. Tạo `docker-compose.prod.yml`
```bash
cd /opt/e-office
nano docker-compose.prod.yml
```

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    container_name: eoffice-postgres
    restart: always
    environment:
      POSTGRES_DB: eoffice_prod
      POSTGRES_USER: eoffice_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - eoffice-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U eoffice_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: eoffice-redis
    restart: always
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - eoffice-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: eoffice-backend
    restart: always
    ports:
      - "4000:4000"
    environment:
      NODE_ENV: production
    volumes:
      - ./backend/storage:/app/storage
      - ./backend/backups:/app/backups
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - eoffice-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_URL: https://api.yourdomain.com
    container_name: eoffice-frontend
    restart: always
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - eoffice-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

  license-server:
    build:
      context: ./license-server
      dockerfile: Dockerfile
    container_name: eoffice-license
    restart: always
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: production
    networks:
      - eoffice-network

volumes:
  postgres_data:
  redis_data:

networks:
  eoffice-network:
    driver: bridge
```

### 3.2. Tạo `.env` cho docker-compose
```bash
nano .env
```

```env
POSTGRES_PASSWORD=YOUR_STRONG_PASSWORD_HERE
```

---

## 🏗️ Step 4: Build & Deploy

### 4.1. Build images
```bash
docker compose -f docker-compose.prod.yml build
```

### 4.2. Start services
```bash
docker compose -f docker-compose.prod.yml up -d
```

### 4.3. Check logs
```bash
docker compose -f docker-compose.prod.yml logs -f
```

### 4.4. Setup database
```bash
# Run migrations
docker exec -it eoffice-backend npx prisma migrate deploy

# Seed initial data
docker exec -it eoffice-backend node scripts/seed.js
docker exec -it eoffice-backend node scripts/seed-rbac.js
docker exec -it eoffice-backend node scripts/seed-document-types.js
docker exec -it eoffice-backend node scripts/seed-workflows-simple.js
```

---

## 🌐 Step 5: Nginx Reverse Proxy

### 5.1. Tạo Nginx config
```bash
nano /etc/nginx/sites-available/eoffice
```

```nginx
# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    client_max_body_size 30M;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5.2. Enable site
```bash
ln -s /etc/nginx/sites-available/eoffice /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## 🔒 Step 6: SSL Certificate

### 6.1. Obtain SSL certificate
```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

### 6.2. Auto-renewal
```bash
# Test renewal
certbot renew --dry-run

# Cron job (already setup by certbot)
systemctl status certbot.timer
```

---

## 🔄 Step 7: Backup Strategy

### 7.1. Tạo backup script
```bash
nano /opt/e-office/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/e-office/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)

# Database backup
docker exec eoffice-postgres pg_dump -U eoffice_user eoffice_prod > "$BACKUP_DIR/db_$DATE.sql"

# Storage backup
tar -czf "$BACKUP_DIR/storage_$DATE.tar.gz" /opt/e-office/backend/storage

# Keep only last 7 days
find $BACKUP_DIR -name "db_*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "storage_*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

### 7.2. Make executable & schedule
```bash
chmod +x /opt/e-office/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
```

```cron
0 2 * * * /opt/e-office/backup.sh >> /var/log/eoffice-backup.log 2>&1
```

---

## 🔧 Step 8: Monitoring & Maintenance

### 8.1. Check service status
```bash
docker compose -f docker-compose.prod.yml ps
```

### 8.2. View logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
```

### 8.3. Restart services
```bash
# All services
docker compose -f docker-compose.prod.yml restart

# Specific service
docker compose -f docker-compose.prod.yml restart backend
```

### 8.4. Update application
```bash
cd /opt/e-office
git pull origin main
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker exec -it eoffice-backend npx prisma migrate deploy
```

---

## 🔥 Firewall Setup

```bash
# Allow SSH
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable
ufw status
```

---

## 📊 Performance Tuning

### PostgreSQL
```bash
# Edit postgresql.conf in container
docker exec -it eoffice-postgres bash
nano /var/lib/postgresql/data/postgresql.conf
```

```conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
min_wal_size = 1GB
max_wal_size = 4GB
```

### Redis
```bash
# Edit redis.conf
docker exec -it eoffice-redis redis-cli CONFIG SET maxmemory 512mb
docker exec -it eoffice-redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

---

## 🐛 Troubleshooting

### Container không start
```bash
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml restart backend
```

### Database connection error
```bash
# Check postgres
docker exec -it eoffice-postgres psql -U eoffice_user -d eoffice_prod

# Reset connection
docker compose -f docker-compose.prod.yml restart postgres backend
```

### Out of disk space
```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a --volumes

# Clean old backups
find /opt/e-office/backups -mtime +30 -delete
```

### High memory usage
```bash
# Check container stats
docker stats

# Restart services
docker compose -f docker-compose.prod.yml restart
```

---

## 📝 Post-Deployment Checklist

- [ ] All services running (`docker compose ps`)
- [ ] Database seeded with initial data
- [ ] SSL certificate installed and auto-renewal working
- [ ] Backup script scheduled in crontab
- [ ] Firewall configured
- [ ] Nginx reverse proxy working
- [ ] Email notifications working (test with real email)
- [ ] Login with admin account: `admin@acme.local / secret123`
- [ ] Change default admin password
- [ ] Monitor logs for errors
- [ ] Setup monitoring (optional: Prometheus + Grafana)

---

## 🔗 Useful Commands

```bash
# View all containers
docker ps -a

# Stop all services
docker compose -f docker-compose.prod.yml down

# Remove all data (DANGEROUS!)
docker compose -f docker-compose.prod.yml down -v

# Backup database manually
docker exec eoffice-postgres pg_dump -U eoffice_user eoffice_prod > backup.sql

# Restore database
cat backup.sql | docker exec -i eoffice-postgres psql -U eoffice_user -d eoffice_prod

# Check Nginx config
nginx -t

# Reload Nginx
systemctl reload nginx

# View system resources
htop
```

---

## 📞 Support

Nếu gặp vấn đề:
1. Check logs: `docker compose logs -f`
2. Check health: `docker compose ps`
3. Check disk space: `df -h`
4. Check memory: `free -h`
5. Restart services: `docker compose restart`

---

**🎉 Deployment Complete!**

Access your application:
- Frontend: https://yourdomain.com
- Backend API: https://api.yourdomain.com
- Health check: https://api.yourdomain.com/health
