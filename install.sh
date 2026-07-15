#!/bin/bash

# ╔═══════════════════════════════════════════════════════════╗
# ║           E-OFFICE - ONE-CLICK INSTALLER                  ║
# ║   Hệ thống quản lý văn bản & phê duyệt điện tử          ║
# ╚═══════════════════════════════════════════════════════════╝

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║           E-OFFICE - ONE-CLICK INSTALLER                  ║"
    echo "║   Hệ thống quản lý văn bản & phê duyệt điện tử          ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        print_error "Vui lòng chạy với quyền root:"
        echo "  sudo bash install.sh"
        exit 1
    fi
}

# Detect OS
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
    else
        print_error "Không thể xác định hệ điều hành"
        exit 1
    fi
}

# Install Docker
install_docker() {
    print_step "Kiểm tra Docker..."
    
    if command -v docker &> /dev/null; then
        print_success "Docker đã được cài đặt"
        return
    fi
    
    print_info "Đang cài đặt Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    
    # Install Docker Compose
    apt-get update
    apt-get install -y docker-compose-plugin
    
    print_success "Docker đã được cài đặt thành công"
}

# Get server info
get_server_info() {
    print_step "Thu thập thông tin server..."
    
    # Get IP
    SERVER_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')
    
    # Ask for domain
    echo ""
    read -p "Bạn có domain không? (y/n): " HAS_DOMAIN
    
    if [[ $HAS_DOMAIN == "y" || $HAS_DOMAIN == "Y" ]]; then
        read -p "Nhập domain (vd: eoffice.com): " DOMAIN
        read -p "Nhập API domain (vd: api.eoffice.com): " API_DOMAIN
        USE_DOMAIN=true
    else
        DOMAIN=$SERVER_IP
        API_DOMAIN=$SERVER_IP
        USE_DOMAIN=false
    fi
    
    print_success "Thông tin server đã được thu thập"
}

# Setup application
setup_app() {
    print_step "Cài đặt ứng dụng..."
    
    # Create directory
    INSTALL_DIR="/opt/e-office"
    mkdir -p $INSTALL_DIR
    cd $INSTALL_DIR
    
    # Clone or download
    if [ -d ".git" ]; then
        print_info "Cập nhật code mới nhất..."
        git pull origin main
    else
        print_info "Tải code từ GitHub..."
        git clone https://github.com/dinhvansh/e-office.git .
    fi
    
    # Generate secrets
    JWT_SECRET=$(openssl rand -hex 32)
    DB_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
    
    # Setup backend .env
    print_info "Cấu hình backend..."
    cd backend
    cat > .env << EOF
# Database
DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@postgres:5432/eoffice"

# JWT
JWT_SECRET="${JWT_SECRET}"
JWT_EXPIRES_IN="7d"

# Server
NODE_ENV="production"
PORT=4000
CORS_ORIGIN="http://${DOMAIN}:3000"

# Redis
REDIS_URL="redis://redis:6379"

# Email (cấu hình sau)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="E-Office <noreply@${DOMAIN}>"

# Storage
STORAGE_PATH="/app/storage"
MAX_FILE_SIZE=26214400

# License
LICENSE_SERVER_URL="http://license-server:3001"
EOF
    
    # Setup frontend .env.local
    print_info "Cấu hình frontend..."
    cd ../frontend
    if [ "$USE_DOMAIN" = true ]; then
        echo "NEXT_PUBLIC_API_URL=https://${API_DOMAIN}" > .env.local
    else
        echo "NEXT_PUBLIC_API_URL=http://${SERVER_IP}:4000" > .env.local
    fi
    
    # Setup docker-compose .env
    cd ..
    echo "POSTGRES_PASSWORD=${DB_PASSWORD}" > .env
    
    print_success "Ứng dụng đã được cấu hình"
}

# Start services
start_services() {
    print_step "Khởi động dịch vụ..."
    
    cd /opt/e-office
    docker compose up -d
    
    print_info "Đợi services khởi động (30 giây)..."
    sleep 30
    
    print_success "Dịch vụ đã được khởi động"
}

# Setup database
setup_database() {
    print_step "Thiết lập cơ sở dữ liệu..."
    
    cd /opt/e-office
    
    # Run migrations
    docker exec e-sign-backend npx prisma migrate deploy
    
    # Seed data
    docker exec e-sign-backend node scripts/seed.js
    docker exec e-sign-backend node scripts/seed-rbac.js
    docker exec e-sign-backend node scripts/seed-document-types.js
    docker exec e-sign-backend node scripts/seed-workflows-simple.js
    
    print_success "Cơ sở dữ liệu đã được thiết lập"
}

# Setup Nginx (if domain)
setup_nginx() {
    if [ "$USE_DOMAIN" = false ]; then
        return
    fi
    
    print_step "Cài đặt Nginx & SSL..."
    
    # Install Nginx
    apt-get update
    apt-get install -y nginx certbot python3-certbot-nginx
    
    # Create Nginx config
    cat > /etc/nginx/sites-available/eoffice << EOF
server {
    listen 80;
    server_name ${DOMAIN};
    client_max_body_size 30M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

server {
    listen 80;
    server_name ${API_DOMAIN};
    client_max_body_size 30M;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    
    # Enable site
    ln -sf /etc/nginx/sites-available/eoffice /etc/nginx/sites-enabled/
    nginx -t
    systemctl reload nginx
    
    # Setup SSL
    print_info "Cài đặt SSL certificate..."
    certbot --nginx -d ${DOMAIN} -d ${API_DOMAIN} --non-interactive --agree-tos --register-unsafely-without-email
    
    print_success "Nginx & SSL đã được cài đặt"
}

# Setup firewall
setup_firewall() {
    print_step "Cấu hình firewall..."
    
    if command -v ufw &> /dev/null; then
        ufw allow 22/tcp
        ufw allow 80/tcp
        ufw allow 443/tcp
        echo "y" | ufw enable
        print_success "Firewall đã được cấu hình"
    else
        print_info "UFW không có sẵn, bỏ qua cấu hình firewall"
    fi
}

# Create management script
create_management_script() {
    print_step "Tạo script quản lý..."
    
    cat > /usr/local/bin/eoffice << 'EOF'
#!/bin/bash

case "$1" in
    start)
        cd /opt/e-office && docker compose up -d
        echo "✓ E-Office đã được khởi động"
        ;;
    stop)
        cd /opt/e-office && docker compose down
        echo "✓ E-Office đã được dừng"
        ;;
    restart)
        cd /opt/e-office && docker compose restart
        echo "✓ E-Office đã được khởi động lại"
        ;;
    logs)
        cd /opt/e-office && docker compose logs -f
        ;;
    status)
        cd /opt/e-office && docker compose ps
        ;;
    update)
        cd /opt/e-office
        git pull origin main
        docker compose up -d --build
        docker exec e-sign-backend npx prisma migrate deploy
        echo "✓ E-Office đã được cập nhật"
        ;;
    backup)
        BACKUP_DIR="/opt/e-office/backups"
        mkdir -p $BACKUP_DIR
        DATE=$(date +%Y-%m-%d_%H-%M-%S)
        docker exec e-sign-postgres pg_dump -U postgres eoffice > "$BACKUP_DIR/db_$DATE.sql"
        echo "✓ Backup đã được tạo: $BACKUP_DIR/db_$DATE.sql"
        ;;
    *)
        echo "E-Office Management Script"
        echo ""
        echo "Sử dụng: eoffice [command]"
        echo ""
        echo "Commands:"
        echo "  start    - Khởi động E-Office"
        echo "  stop     - Dừng E-Office"
        echo "  restart  - Khởi động lại E-Office"
        echo "  logs     - Xem logs"
        echo "  status   - Xem trạng thái"
        echo "  update   - Cập nhật phiên bản mới"
        echo "  backup   - Backup database"
        ;;
esac
EOF
    
    chmod +x /usr/local/bin/eoffice
    print_success "Script quản lý đã được tạo"
}

# Print final info
print_final_info() {
    echo ""
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║          CÀI ĐẶT THÀNH CÔNG! 🎉                          ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    if [ "$USE_DOMAIN" = true ]; then
        echo -e "${BLUE}🌐 Truy cập ứng dụng:${NC}"
        echo "   Frontend: https://${DOMAIN}"
        echo "   Backend:  https://${API_DOMAIN}"
    else
        echo -e "${BLUE}🌐 Truy cập ứng dụng:${NC}"
        echo "   Frontend: http://${SERVER_IP}:3000"
        echo "   Backend:  http://${SERVER_IP}:4000"
    fi
    
    echo ""
    echo -e "${BLUE}🔐 Đăng nhập:${NC}"
    echo "   Email:    admin@acme.local"
    echo "   Password: set DEMO_ADMIN_PASSWORD before running the seed"
    echo ""
    echo -e "${YELLOW}⚠️  Nhớ đổi password ngay sau khi đăng nhập!${NC}"
    echo ""
    echo -e "${BLUE}📝 Quản lý hệ thống:${NC}"
    echo "   eoffice start    - Khởi động"
    echo "   eoffice stop     - Dừng"
    echo "   eoffice restart  - Khởi động lại"
    echo "   eoffice logs     - Xem logs"
    echo "   eoffice status   - Xem trạng thái"
    echo "   eoffice update   - Cập nhật"
    echo "   eoffice backup   - Backup database"
    echo ""
    echo -e "${BLUE}📚 Tài liệu:${NC}"
    echo "   /opt/e-office/docs/DEPLOY-SIMPLE.md"
    echo ""
    echo -e "${GREEN}Cảm ơn bạn đã sử dụng E-Office!${NC}"
    echo ""
}

# Main installation flow
main() {
    print_header
    
    check_root
    detect_os
    install_docker
    get_server_info
    setup_app
    start_services
    setup_database
    setup_nginx
    setup_firewall
    create_management_script
    
    print_final_info
}

# Run installation
main
