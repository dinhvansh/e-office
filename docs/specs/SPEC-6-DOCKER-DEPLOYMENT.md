# SPEC-6: Docker Deployment & Distribution

## 📋 Overview
Đóng gói E-Office thành Docker images để dễ dàng deploy trên bất kỳ máy nào.

**Priority**: HIGH  
**Estimated Time**: 2 days  
**Impact**: Simplified deployment, consistent environments

---

## 🎯 Goals
- Docker images cho backend, frontend, database
- Docker Compose setup cho development và production
- Easy one-command deployment
- Environment configuration guide
- Backup và restore scripts

---

## 📝 Task Breakdown

### Task 6.1: Backend Dockerfile (3 hours)

**File**: `backend/Dockerfile`

```dockerfile
# Multi-stage build for smaller image size
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Generate Prisma client
RUN npx prisma generate

# Production stage
FROM node:20-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S eoffice -u 1001

# Copy built files from builder
COPY --from=builder --chown=eoffice:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=eoffice:nodejs /app/dist ./dist
COPY --from=builder --chown=eoffice:nodejs /app/prisma ./prisma
COPY --from=builder --chown=eoffice:nodejs /app/package*.json ./

# Create storage directory
RUN mkdir -p /app/storage && \
    chown -R eoffice:nodejs /app/storage

USER eoffice

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/server.js"]
```

**Build script** (`backend/build-docker.sh`):
```bash
#!/bin/bash
set -e

VERSION=${1:-latest}

echo "Building backend Docker image..."
docker build -t eoffice-backend:$VERSION .

echo "✅ Built eoffice-backend:$VERSION"
```

**Acceptance Criteria**:
- ✅ Multi-stage build (smaller image)
- ✅ Non-root user for security
- ✅ Health check endpoint
- ✅ Image size < 200MB

---

### Task 6.2: Frontend Dockerfile (3 hours)

**File**: `frontend/Dockerfile`

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci && \
    npm cache clean --force

# Copy source
COPY . .

# Build Next.js app
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built Next.js static files
COPY --from=builder /app/out /usr/share/nginx/html

# Create non-root user
RUN adduser -D -u 1001 eoffice && \
    chown -R eoffice:eoffice /usr/share/nginx/html

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost:3000 || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

**Nginx Config** (`frontend/nginx.conf`):
```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 3000;
        server_name _;
        root /usr/share/nginx/html;
        
        # Gzip compression
        gzip on;
        gzip_types text/plain text/css application/json application/javascript;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        
        location / {
            try_files $uri $uri/ /index.html;
        }
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

**Build script** (`frontend/build-docker.sh`):
```bash
#!/bin/bash
set -e

VERSION=${1:-latest}
API_URL=${2:-http://localhost:4000}

echo "Building frontend Docker image..."
docker build \
  --build-arg NEXT_PUBLIC_API_URL=$API_URL \
  -t eoffice-frontend:$VERSION .

echo "✅ Built eoffice-frontend:$VERSION"
```

**Acceptance Criteria**:
- ✅ Static build với Next.js
- ✅ Nginx for serving
- ✅ Gzip compression
- ✅ Security headers
- ✅ Image size < 50MB

---

### Task 6.3: Docker Compose - Development (2 hours)

**File**: `docker-compose.dev.yml`

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:14-alpine
    container_name: eoffice-postgres-dev
    restart: unless-stopped
    environment:
      POSTGRES_USER: eoffice
      POSTGRES_PASSWORD: eoffice_dev_password
      POSTGRES_DB: eoffice_dev
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U eoffice"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: eoffice-redis-dev
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: eoffice-backend-dev
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      NODE_ENV: development
      PORT: 4000
      DATABASE_URL: postgresql://eoffice:eoffice_dev_password@postgres:5432/eoffice_dev
      REDIS_URL: redis://redis:6379
      JWT_SECRET: dev_jwt_secret_change_in_production
      STORAGE_BASE_PATH: /app/storage
      FRONTEND_URL: http://localhost:3000
    ports:
      - "4000:4000"
    volumes:
      - ./backend:/app
      - /app/node_modules
      - backend_storage:/app/storage
    command: npm run dev
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 3s
      retries: 3

  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_URL: http://localhost:4000
    container_name: eoffice-frontend-dev
    restart: unless-stopped
    depends_on:
      - backend
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:4000
    command: npm run dev

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  backend_storage:
    driver: local

networks:
  default:
    name: eoffice-network-dev
```

**Usage**:
```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop all services
docker-compose -f docker-compose.dev.yml down

# Reset everything (including data)
docker-compose -f docker-compose.dev.yml down -v
```

---

### Task 6.4: Docker Compose - Production (3 hours)

**File**: `docker-compose.prod.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    container_name: eoffice-postgres
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - eoffice-internal
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: eoffice-redis
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - eoffice-internal
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  backend:
    image: eoffice-backend:${VERSION:-latest}
    container_name: eoffice-backend
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 4000
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      STORAGE_BASE_PATH: /app/storage
      FRONTEND_URL: ${FRONTEND_URL}
      
      # Email config
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      SMTP_FROM: ${SMTP_FROM}
    volumes:
      - backend_storage:/app/storage
      - ./logs:/app/logs
    networks:
      - eoffice-internal
      - eoffice-public
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 40s

  frontend:
    image: eoffice-frontend:${VERSION:-latest}
    container_name: eoffice-frontend
    restart: always
    depends_on:
      - backend
    networks:
      - eoffice-public
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 3s
      retries: 3

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: eoffice-nginx
    restart: always
    depends_on:
      - frontend
      - backend
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./nginx/logs:/var/log/nginx
    networks:
      - eoffice-public

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  backend_storage:
    driver: local

networks:
  eoffice-internal:
    driver: bridge
  eoffice-public:
    driver: bridge
```

**Environment File** (`.env.production`):
```bash
# App Version
VERSION=1.0.0

# Database
DB_USER=eoffice_prod
DB_PASSWORD=CHANGE_THIS_STRONG_PASSWORD
DB_NAME=eoffice_production

# Redis
REDIS_PASSWORD=CHANGE_THIS_REDIS_PASSWORD

# JWT
JWT_SECRET=CHANGE_THIS_JWT_SECRET_MIN_32_CHARS

# Frontend URL
FRONTEND_URL=https://eoffice.yourdomain.com

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=E-Office <noreply@yourdomain.com>

# SSL (if using Let's Encrypt)
SSL_EMAIL=admin@yourdomain.com
SSL_DOMAIN=eoffice.yourdomain.com
```

---

### Task 6.5: Production Nginx Config (2 hours)

**File**: `nginx/nginx.conf`

```nginx
events {
    worker_connections 2048;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;

    # Upstream backends
    upstream backend {
        server backend:4000;
    }

    upstream frontend {
        server frontend:3000;
    }

    # HTTP -> HTTPS redirect
    server {
        listen 80;
        server_name eoffice.yourdomain.com;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name eoffice.yourdomain.com;

        # SSL certificates
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        
        # SSL settings
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        
        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;

        # Max upload size
        client_max_body_size 50M;

        # API routes
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Auth endpoints (stricter rate limiting)
        location ~ ^/api/v1/auth/(login|register|forgot-password) {
            limit_req zone=auth_limit burst=3 nodelay;
            
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

---

### Task 6.6: Deployment Scripts (4 hours)

**File**: `scripts/deploy.sh`

```bash
#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 E-Office Deployment Script${NC}"
echo "================================"

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}Error: .env.production not found${NC}"
    echo "Please create .env.production from .env.production.example"
    exit 1
fi

# Load environment
export $(cat .env.production | xargs)

# Confirm deployment
echo -e "${YELLOW}Deploying version: ${VERSION}${NC}"
echo -e "${YELLOW}Database: ${DB_NAME}${NC}"
echo -e "${YELLOW}Frontend URL: ${FRONTEND_URL}${NC}"
echo ""
read -p "Continue with deployment? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled"
    exit 0
fi

# Step 1: Pull latest code
echo -e "\n${GREEN}Step 1: Pulling latest code...${NC}"
git pull origin main

# Step 2: Build Docker images
echo -e "\n${GREEN}Step 2: Building Docker images...${NC}"
cd backend && bash build-docker.sh $VERSION
cd ../frontend && bash build-docker.sh $VERSION http://localhost:4000
cd ..

# Step 3: Backup database
echo -e "\n${GREEN}Step 3: Creating database backup...${NC}"
bash scripts/backup-db.sh

# Step 4: Run database migrations
echo -e "\n${GREEN}Step 4: Running database migrations...${NC}"
docker-compose -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy

# Step 5: Stop old containers
echo -e "\n${GREEN}Step 5: Stopping old containers...${NC}"
docker-compose -f docker-compose.prod.yml down

# Step 6: Start new containers
echo -e "\n${GREEN}Step 6: Starting new containers...${NC}"
docker-compose -f docker-compose.prod.yml up -d

# Step 7: Health check
echo -e "\n${GREEN}Step 7: Waiting for services to be healthy...${NC}"
sleep 10

# Check backend health
for i in {1..30}; do
    if curl -f http://localhost:4000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is healthy${NC}"
        break
    fi
    echo "Waiting for backend... ($i/30)"
    sleep 2
done

# Check frontend health
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is healthy${NC}"
else
    echo -e "${RED}❌ Frontend health check failed${NC}"
fi

# Step 8: Show logs
echo -e "\n${GREEN}Deployment complete!${NC}"
echo "View logs with: docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "Services:"
echo "- Frontend: ${FRONTEND_URL}"
echo "- Backend API: ${FRONTEND_URL}/api"
```

**File**: `scripts/backup-db.sh`

```bash
#!/bin/bash
set -e

# Load environment
export $(cat .env.production | xargs)

# Create backups directory
mkdir -p backups

# Backup filename with timestamp
BACKUP_FILE="backups/eoffice_backup_$(date +%Y%m%d_%H%M%S).sql"

echo "Creating database backup: $BACKUP_FILE"

# Run pg_dump inside docker container
docker-compose -f docker-compose.prod.yml exec -T postgres \
    pg_dump -U $DB_USER $DB_NAME > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

echo "✅ Backup created: ${BACKUP_FILE}.gz"

# Keep only last 7 backups
ls -t backups/*.sql.gz | tail -n +8 | xargs -r rm

echo "✅ Old backups cleaned up"
```

**File**: `scripts/restore-db.sh`

```bash
#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    echo "Available backups:"
    ls -lh backups/
    exit 1
fi

BACKUP_FILE=$1

# Load environment
export $(cat .env.production | xargs)

echo "⚠️  This will REPLACE the current database!"
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

# Decompress if needed
if [[ $BACKUP_FILE == *.gz ]]; then
    echo "Decompressing..."
    gunzip -c $BACKUP_FILE > /tmp/restore.sql
    SQL_FILE=/tmp/restore.sql
else
    SQL_FILE=$BACKUP_FILE
fi

# Restore database
echo "Restoring database..."
docker-compose -f docker-compose.prod.yml exec -T postgres \
    psql -U $DB_USER -d $DB_NAME < $SQL_FILE

# Cleanup
rm -f /tmp/restore.sql

echo "✅ Database restored successfully"
```

---

### Task 6.7: Installation Guide (2 hours)

**File**: `INSTALLATION.md`

```markdown
# E-Office Installation Guide

## 📋 Requirements

- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 20GB disk space

## 🚀 Quick Start (Development)

### 1. Clone repository
\`\`\`bash
git clone https://github.com/dinhvansh/e-office.git
cd e-office
\`\`\`

### 2. Start development environment
\`\`\`bash
docker-compose -f docker-compose.dev.yml up -d
\`\`\`

### 3. Initialize database
\`\`\`bash
docker-compose -f docker-compose.dev.yml exec backend npx prisma migrate deploy
docker-compose -f docker-compose.dev.yml exec backend node scripts/seed.js
\`\`\`

### 4. Access application
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Login: admin@acme.local / secret123

## 🏭 Production Installation

### 1. Prepare server
Minimum specs: 2 CPU cores, 4GB RAM, 50GB storage

### 2. Install Docker
\`\`\`bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl enable docker
sudo systemctl start docker
\`\`\`

### 3. Clone and configure
\`\`\`bash
git clone https://github.com/dinhvansh/e-office.git
cd e-office

# Create production config
cp .env.production.example .env.production
nano .env.production  # Edit configuration
\`\`\`

### 4. Configure environment
Edit `.env.production`:
- Set strong passwords for DB_PASSWORD, REDIS_PASSWORD, JWT_SECRET
- Set FRONTEND_URL to your domain
- Configure SMTP settings

### 5. Setup SSL (Let's Encrypt)
\`\`\`bash
# Install certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d eoffice.yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/eoffice.yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/eoffice.yourdomain.com/privkey.pem nginx/ssl/
\`\`\`

### 6. Deploy
\`\`\`bash
bash scripts/deploy.sh
\`\`\`

## 📦 Backup & Restore

### Create backup
\`\`\`bash
bash scripts/backup-db.sh
\`\`\`

### Restore backup
\`\`\`bash
bash scripts/restore-db.sh backups/eoffice_backup_20251129_120000.sql.gz
\`\`\`

## 🔧 Maintenance

### View logs
\`\`\`bash
docker-compose -f docker-compose.prod.yml logs -f
\`\`\`

### Restart services
\`\`\`bash
docker-compose -f docker-compose.prod.yml restart
\`\`\`

### Update to new version
\`\`\`bash
git pull origin main
bash scripts/deploy.sh
\`\`\`

## 🐛 Troubleshooting

### Database connection failed
Check if PostgreSQL is running:
\`\`\`bash
docker-compose -f docker-compose.prod.yml ps postgres
docker-compose -f docker-compose.prod.yml logs postgres
\`\`\`

### Backend not accessible
Check backend logs:
\`\`\`bash
docker-compose -f docker-compose.prod.yml logs backend
\`\`\`

### Reset everything (DEV ONLY)
\`\`\`bash
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
\`\`\`
```

---

## 🧪 Testing Plan

### Test Docker build
```bash
cd backend && docker build -t test-backend .
cd ../frontend && docker build -t test-frontend .
```

### Test production deployment (staging)
```bash
# Use docker-compose.prod.yml with test environment
docker-compose -f docker-compose.prod.yml up -d
# Run integration tests
# Check all services healthy
```

---

## 📊 Success Metrics

- **Build Time**: < 5 minutes
- **Deployment Time**: < 2 minutes
- **Image Sizes**: Backend < 200MB, Frontend < 50MB
- **Container Startup**: < 30 seconds
- **Zero-downtime Updates**: Yes (with blue-green deployment)

---

## 🚀 Deployment Checklist

### Pre-deployment
- [ ] Docker và Docker Compose installed
- [ ] .env.production configured
- [ ] SSL certificates obtained
- [ ] Domain DNS configured
- [ ] Firewall rules set (80, 443)

### Deployment
- [ ] Images built successfully
- [ ] Database backup created
- [ ] Migrations ran successfully
- [ ] Services started
- [ ] Health checks passing

### Post-deployment
- [ ] Frontend accessible via domain
- [ ] Backend API responding
- [ ] Login working
- [ ] Document upload working
- [ ] Email sending working
- [ ] Monitoring enabled

---

## 📚 Additional Files Needed

1. **.dockerignore** (backend & frontend)
2. **nginx/ssl/** (SSL certificates)
3. **.env.production.example** (template)
4. **scripts/health-check.sh** (monitoring)
5. **docker-compose.override.yml** (local overrides)
