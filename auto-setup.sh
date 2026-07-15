#!/bin/bash

# ============================================
# E-Office Auto Setup Script
# ============================================
# Tự động setup toàn bộ trên VPS Ubuntu/Debian
# Chỉ cần: git clone && cd e-office && bash auto-setup.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════╗"
echo "║   E-Office Auto Setup Script v1.0      ║"
echo "║   Tự động cài đặt toàn bộ hệ thống     ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo -e "${RED}❌ Không nên chạy script này với sudo!${NC}"
    echo "   Chạy: bash auto-setup.sh"
    echo "   Script sẽ tự động yêu cầu sudo khi cần"
    exit 1
fi

# ============================================
# 1. Detect OS
# ============================================
echo -e "${BLUE}[1/10]${NC} Đang kiểm tra hệ điều hành..."

if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VER=$VERSION_ID
    echo -e "${GREEN}✓${NC} Phát hiện: $PRETTY_NAME"
else
    echo -e "${RED}❌ Không thể xác định hệ điều hành${NC}"
    exit 1
fi

# ============================================
# 2. Install Docker
# ============================================
echo ""
echo -e "${BLUE}[2/10]${NC} Đang cài đặt Docker..."

if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker đã được cài đặt: $(docker --version)"
else
    echo "   Đang cài đặt Docker..."
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker $USER
    echo -e "${GREEN}✓${NC} Docker đã được cài đặt"
fi

# Install Docker Compose plugin
if docker compose version &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker Compose đã được cài đặt"
else
    echo "   Đang cài đặt Docker Compose..."
    
    # Try plugin first
    if sudo apt-get install -y docker-compose-plugin 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Docker Compose plugin đã được cài đặt"
    else
        # Fallback to standalone docker-compose
        echo "   Plugin không có, cài standalone docker-compose..."
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        echo -e "${GREEN}✓${NC} Docker Compose standalone đã được cài đặt"
    fi
fi

# ============================================
# 3. Get VPS Information
# ============================================
echo ""
echo -e "${BLUE}[3/10]${NC} Đang lấy thông tin VPS..."

VPS_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "localhost")
echo -e "${GREEN}✓${NC} VPS IP: $VPS_IP"

# ============================================
# 4. Generate Secrets
# ============================================
echo ""
echo -e "${BLUE}[4/10]${NC} Đang tạo secrets..."

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
    sudo apt-get install -y openssl
fi

JWT_SECRET=$(openssl rand -base64 32)
REFRESH_TOKEN_SECRET=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-20)

if [ -z "${DEMO_ADMIN_PASSWORD:-}" ]; then
    read -rsp "Set a unique demo admin password (minimum 16 characters): " DEMO_ADMIN_PASSWORD
    echo
fi
if [ ${#DEMO_ADMIN_PASSWORD} -lt 16 ]; then
    echo -e "${RED}Demo admin password must contain at least 16 characters.${NC}"
    exit 1
fi
export DEMO_ADMIN_PASSWORD

echo -e "${GREEN}✓${NC} Secrets đã được tạo"

# ============================================
# 5. Configure Email (Optional)
# ============================================
echo ""
echo -e "${BLUE}[5/10]${NC} Cấu hình Email (tùy chọn)..."
echo ""
echo "Email được dùng để gửi thông báo và OTP cho người ký."
echo "Bạn có thể bỏ qua và cấu hình sau."
echo ""

read -p "Bạn có muốn cấu hình email ngay bây giờ? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Chọn email provider:"
    echo "1) Gmail"
    echo "2) Outlook"
    echo "3) SendGrid"
    echo "4) Khác"
    read -p "Chọn (1-4): " email_choice
    
    case $email_choice in
        1)
            SMTP_HOST="smtp.gmail.com"
            SMTP_PORT="587"
            echo ""
            echo -e "${YELLOW}Lưu ý:${NC} Gmail yêu cầu App Password"
            echo "Tạo tại: https://myaccount.google.com/apppasswords"
            ;;
        2)
            SMTP_HOST="smtp-mail.outlook.com"
            SMTP_PORT="587"
            ;;
        3)
            SMTP_HOST="smtp.sendgrid.net"
            SMTP_PORT="587"
            echo -e "${YELLOW}Lưu ý:${NC} SMTP_USER=apikey, SMTP_PASSWORD=<SendGrid API Key>"
            ;;
        4)
            read -p "SMTP Host: " SMTP_HOST
            read -p "SMTP Port (587): " SMTP_PORT
            SMTP_PORT=${SMTP_PORT:-587}
            ;;
        *)
            SMTP_HOST="smtp.gmail.com"
            SMTP_PORT="587"
            ;;
    esac
    
    read -p "Email address: " SMTP_USER
    read -sp "Email password/API key: " SMTP_PASSWORD
    echo ""
    read -p "Email From (noreply@$VPS_IP): " EMAIL_FROM
    EMAIL_FROM=${EMAIL_FROM:-noreply@$VPS_IP}
    
    EMAIL_CONFIGURED=true
else
    SMTP_HOST="smtp.gmail.com"
    SMTP_PORT="587"
    SMTP_USER=""
    SMTP_PASSWORD=""
    EMAIL_FROM="noreply@$VPS_IP"
    EMAIL_CONFIGURED=false
    echo -e "${YELLOW}⚠${NC}  Email chưa được cấu hình. Emails sẽ được log ra console."
fi

# ============================================
# 6. Create Environment Files
# ============================================
echo ""
echo -e "${BLUE}[6/10]${NC} Đang tạo environment files..."

# Root .env
cat > .env << EOF
# E-Office Environment Variables
# Auto-generated: $(date)

# Database
DB_USER=eoffice_user
DB_PASSWORD=$DB_PASSWORD
DB_NAME=eoffice_prod
DATABASE_URL=postgresql://eoffice_user:$DB_PASSWORD@db:5432/eoffice_prod

# Redis
REDIS_URL=redis://redis:6379

# JWT Secrets
JWT_SECRET=$JWT_SECRET
REFRESH_TOKEN_SECRET=$REFRESH_TOKEN_SECRET
DEMO_ADMIN_PASSWORD=$DEMO_ADMIN_PASSWORD

# Application URLs
VPS_IP=$VPS_IP
FRONTEND_URL=http://$VPS_IP:3000
BACKEND_URL=http://$VPS_IP:4000
NEXT_PUBLIC_API_BASE_URL=http://$VPS_IP:4000/api/v1

# CORS
CORS_ORIGIN=http://$VPS_IP:3000

# Email
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USER=$SMTP_USER
SMTP_PASSWORD=$SMTP_PASSWORD
EMAIL_FROM=$EMAIL_FROM
EOF

chmod 600 .env

# Backend .env
cat > backend/.env << EOF
NODE_ENV=production
PORT=4000

DATABASE_URL=postgresql://eoffice_user:$DB_PASSWORD@db:5432/eoffice_prod
REDIS_URL=redis://redis:6379

JWT_SECRET=$JWT_SECRET
REFRESH_TOKEN_SECRET=$REFRESH_TOKEN_SECRET
DEMO_ADMIN_PASSWORD=$DEMO_ADMIN_PASSWORD
TOKEN_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=30d

CORS_ORIGIN=http://$VPS_IP:3000

SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_SECURE=false
SMTP_USER=$SMTP_USER
SMTP_PASSWORD=$SMTP_PASSWORD
EMAIL_FROM=$EMAIL_FROM
EMAIL_FROM_NAME=E-Office System

STORAGE_BUCKET=local
STORAGE_BASE_PATH=./storage
EOF

chmod 600 backend/.env

# Frontend .env.local
cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_BASE_URL=http://$VPS_IP:4000/api/v1
EOF

chmod 600 frontend/.env.local

echo -e "${GREEN}✓${NC} Environment files đã được tạo"

# ============================================
# 7. Create Storage Directory
# ============================================
echo ""
echo -e "${BLUE}[7/10]${NC} Đang tạo storage directory..."

mkdir -p storage
chmod 755 storage

echo -e "${GREEN}✓${NC} Storage directory đã được tạo"

# ============================================
# 8. Build Docker Images
# ============================================
echo ""
echo -e "${BLUE}[8/10]${NC} Đang build Docker images..."
echo "   (Quá trình này có thể mất 5-10 phút)"

# Detect docker compose command (plugin vs standalone)
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    echo -e "${RED}❌ Docker Compose not found${NC}"
    exit 1
fi

if $DOCKER_COMPOSE build --no-cache; then
    echo -e "${GREEN}✓${NC} Docker images đã được build"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# ============================================
# 9. Start Services
# ============================================
echo ""
echo -e "${BLUE}[9/10]${NC} Đang khởi động services..."

$DOCKER_COMPOSE up -d

echo "   Đợi services khởi động (30 giây)..."
sleep 30

# Check if services are running
if $DOCKER_COMPOSE ps | grep -q "Up"; then
    echo -e "${GREEN}✓${NC} Services đã được khởi động"
else
    echo -e "${RED}❌ Một số services không khởi động được${NC}"
    $DOCKER_COMPOSE ps
    exit 1
fi

# ============================================
# 10. Setup Database
# ============================================
echo ""
echo -e "${BLUE}[10/10]${NC} Đang setup database..."

echo "   Chạy migrations..."
$DOCKER_COMPOSE exec -T backend npx prisma migrate deploy 2>/dev/null || \
$DOCKER_COMPOSE exec -T backend npx prisma db push

echo "   Seeding data..."
$DOCKER_COMPOSE exec -T backend node scripts/seed.js
$DOCKER_COMPOSE exec -T backend node scripts/seed-rbac.js
$DOCKER_COMPOSE exec -T backend node scripts/seed-document-types.js
$DOCKER_COMPOSE exec -T backend node scripts/seed-workflows-simple.js

echo -e "${GREEN}✓${NC} Database đã được setup"

# ============================================
# Save Credentials
# ============================================
cat > .credentials.txt << EOF
E-Office Deployment Credentials
================================
Generated: $(date)

VPS Information:
  IP Address: $VPS_IP
  Frontend URL: http://$VPS_IP:3000
  Backend URL: http://$VPS_IP:4000

Database:
  User: eoffice_user
  Password: $DB_PASSWORD
  Database: eoffice_prod
  Connection: postgresql://eoffice_user:$DB_PASSWORD@localhost:5432/eoffice_prod

JWT Secrets:
  JWT_SECRET: $JWT_SECRET
  REFRESH_TOKEN_SECRET: $REFRESH_TOKEN_SECRET

Email Configuration:
  SMTP Host: $SMTP_HOST
  SMTP Port: $SMTP_PORT
  SMTP User: $SMTP_USER
  Email From: $EMAIL_FROM
  Configured: $EMAIL_CONFIGURED

Default Admin Account:
  Email: admin@acme.local
  Password: supplied through DEMO_ADMIN_PASSWORD (not written here)
  
⚠️  QUAN TRỌNG:
  1. Đổi password admin ngay sau khi đăng nhập
  2. Backup file này ở nơi an toàn
  3. XÓA file này sau khi backup: rm .credentials.txt

Docker Commands:
  View logs: docker compose logs -f
  Restart: docker compose restart
  Stop: docker compose down
  Rebuild: docker compose up -d --build
EOF

chmod 600 .credentials.txt

# ============================================
# Final Summary
# ============================================
echo ""
echo -e "${GREEN}"
echo "╔════════════════════════════════════════╗"
echo "║     ✅ SETUP HOÀN TẤT THÀNH CÔNG!     ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${BLUE}📋 Thông tin truy cập:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  🌐 Frontend:  ${GREEN}http://$VPS_IP:3000${NC}"
echo -e "  🔧 Backend:   ${GREEN}http://$VPS_IP:4000${NC}"
echo -e "  💚 Health:    ${GREEN}http://$VPS_IP:4000/health${NC}"
echo ""
echo -e "${BLUE}🔐 Đăng nhập:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Email:    admin@acme.local"
echo "  Password: the value supplied through DEMO_ADMIN_PASSWORD"
echo ""
echo -e "${YELLOW}⚠️  LƯU Ý QUAN TRỌNG:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  1. Đổi password admin ngay sau khi đăng nhập"
echo "  2. Credentials đã lưu trong: .credentials.txt"
echo "  3. Backup file .credentials.txt và XÓA sau đó"
echo ""

if [ "$EMAIL_CONFIGURED" = false ]; then
    echo -e "${YELLOW}📧 Email chưa được cấu hình:${NC}"
    echo "   Emails sẽ được log ra console."
    echo "   Để cấu hình email, edit file backend/.env"
    echo "   Sau đó: docker compose restart backend"
    echo ""
fi

echo -e "${BLUE}📝 Các lệnh hữu ích:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Xem logs:        docker compose logs -f"
echo "  Xem logs backend: docker compose logs -f backend"
echo "  Xem logs frontend: docker compose logs -f frontend"
echo "  Restart:         docker compose restart"
echo "  Stop:            docker compose down"
echo "  Rebuild:         docker compose up -d --build"
echo "  Check status:    docker compose ps"
echo ""
echo -e "${BLUE}🔥 Firewall (nếu cần):${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  sudo ufw allow 3000/tcp  # Frontend"
echo "  sudo ufw allow 4000/tcp  # Backend"
echo "  sudo ufw allow 22/tcp    # SSH"
echo "  sudo ufw enable"
echo ""
echo -e "${GREEN}🎉 Hệ thống đã sẵn sàng sử dụng!${NC}"
echo ""

# Check if need to logout for docker group
if ! groups | grep -q docker; then
    echo -e "${YELLOW}⚠️  Lưu ý:${NC} Bạn cần logout và login lại để docker group có hiệu lực"
    echo "   Hoặc chạy: newgrp docker"
    echo ""
fi
