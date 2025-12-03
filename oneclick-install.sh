#!/bin/bash

# E-Office One-Click Installation Script
# Run: curl -fsSL https://raw.githubusercontent.com/your-repo/e-office/main/oneclick-install.sh | bash
# Or: bash oneclick-install.sh

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║           E-OFFICE ONE-CLICK INSTALLATION                  ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_warning "Please do not run as root. Run as normal user with sudo privileges."
    exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VER=$VERSION_ID
else
    print_error "Cannot detect OS"
    exit 1
fi

print_info "Detected OS: $OS $VER"
echo ""

# Check and install Docker
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 1: Checking Docker Installation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v docker &> /dev/null; then
    print_success "Docker is already installed ($(docker --version))"
else
    print_warning "Docker not found. Installing Docker..."
    
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        # Install Docker on Ubuntu/Debian
        sudo apt-get update
        sudo apt-get install -y ca-certificates curl gnupg
        sudo install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/$OS/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        sudo chmod a+r /etc/apt/keyrings/docker.gpg
        
        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS \
          $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
          sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        
        sudo apt-get update
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        
        # Add user to docker group
        sudo usermod -aG docker $USER
        print_success "Docker installed successfully"
        print_warning "You may need to log out and back in for group changes to take effect"
        
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
        # Install Docker on CentOS/RHEL
        sudo yum install -y yum-utils
        sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        sudo systemctl start docker
        sudo systemctl enable docker
        sudo usermod -aG docker $USER
        print_success "Docker installed successfully"
        
    else
        print_error "Unsupported OS for automatic Docker installation"
        print_info "Please install Docker manually: https://docs.docker.com/engine/install/"
        exit 1
    fi
fi

# Check Docker Compose
if docker compose version &> /dev/null; then
    print_success "Docker Compose is available ($(docker compose version))"
else
    print_error "Docker Compose not found"
    exit 1
fi

echo ""

# Check Git
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 2: Checking Git Installation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v git &> /dev/null; then
    print_success "Git is already installed ($(git --version))"
else
    print_warning "Git not found. Installing Git..."
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        sudo apt-get install -y git
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
        sudo yum install -y git
    fi
    print_success "Git installed successfully"
fi

echo ""

# Clone or update repository
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 3: Getting E-Office Code"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

INSTALL_DIR="/opt/e-office"

if [ -d "$INSTALL_DIR" ]; then
    print_warning "E-Office directory already exists"
    read -p "Do you want to update it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd $INSTALL_DIR
        print_info "Pulling latest changes..."
        git pull origin main
        print_success "Code updated"
    fi
else
    print_info "Cloning E-Office repository..."
    sudo mkdir -p /opt
    sudo chown $USER:$USER /opt
    cd /opt
    
    # Replace with your actual repo URL
    REPO_URL="https://github.com/your-username/e-office.git"
    
    if git clone $REPO_URL e-office; then
        print_success "Repository cloned successfully"
    else
        print_error "Failed to clone repository"
        print_info "Please check the repository URL and try again"
        exit 1
    fi
fi

cd $INSTALL_DIR

echo ""

# Configure environment
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 4: Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get server IP
SERVER_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')
print_info "Detected server IP: $SERVER_IP"

# Ask for custom domain or use IP
read -p "Do you have a custom domain? (leave empty to use IP): " CUSTOM_DOMAIN

if [ -z "$CUSTOM_DOMAIN" ]; then
    FRONTEND_URL="http://$SERVER_IP:3000"
    BACKEND_URL="http://$SERVER_IP:4000"
    CORS_ORIGIN="http://$SERVER_IP:3000"
else
    FRONTEND_URL="http://$CUSTOM_DOMAIN:3000"
    BACKEND_URL="http://$CUSTOM_DOMAIN:4000"
    CORS_ORIGIN="http://$CUSTOM_DOMAIN:3000,http://$CUSTOM_DOMAIN"
fi

print_info "Frontend URL: $FRONTEND_URL"
print_info "Backend URL: $BACKEND_URL"

# Generate JWT secrets
print_info "Generating secure JWT secrets..."
JWT_SECRET=$(openssl rand -base64 32)
REFRESH_TOKEN_SECRET=$(openssl rand -base64 32)
print_success "JWT secrets generated"

# Create backend .env file
print_info "Creating backend configuration..."
cat > backend/.env << EOF
# Application
NODE_ENV=production
PORT=4000

# Database (Docker)
DATABASE_URL="postgresql://eoffice:eoffice123@db:5432/eoffice_db"

# JWT (Auto-generated)
JWT_SECRET=$JWT_SECRET
REFRESH_TOKEN_SECRET=$REFRESH_TOKEN_SECRET
TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Redis (Docker)
REDIS_URL=redis://redis:6379

# License Server
LICENSE_SERVER_URL=http://license-server:5000/api/v1

# CORS
CORS_ORIGIN=$CORS_ORIGIN

# Storage
STORAGE_BUCKET=local
STORAGE_BASE_PATH=./storage

# Email Configuration (Update these with your SMTP settings)
SMTP_HOST=mail.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@example.com
SMTP_PASSWORD=changeme
EMAIL_FROM=noreply@example.com
EMAIL_FROM_NAME=E-Office System
EOF

print_success "Backend configuration created"

# Update docker-compose.yml with correct IP
print_info "Updating docker-compose.yml..."
sed -i "s|NEXT_PUBLIC_API_URL:.*|NEXT_PUBLIC_API_URL: $BACKEND_URL|g" docker-compose.yml 2>/dev/null || \
sed -i '' "s|NEXT_PUBLIC_API_URL:.*|NEXT_PUBLIC_API_URL: $BACKEND_URL|g" docker-compose.yml

sed -i "s|CORS_ORIGIN:.*|CORS_ORIGIN: $CORS_ORIGIN|g" docker-compose.yml 2>/dev/null || \
sed -i '' "s|CORS_ORIGIN:.*|CORS_ORIGIN: $CORS_ORIGIN|g" docker-compose.yml

print_success "Docker configuration updated"

echo ""

# Build and start
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 5: Building and Starting E-Office"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_info "This may take 5-10 minutes..."
echo ""

# Stop existing containers
if docker compose ps -q 2>/dev/null | grep -q .; then
    print_info "Stopping existing containers..."
    docker compose down
fi

# Clean up old data (optional)
read -p "Do you want to clean up old data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Removing old containers and volumes..."
    docker compose down -v --rmi all 2>/dev/null || true
    docker system prune -af --volumes 2>/dev/null || true
fi

# Build and start
print_info "Building Docker images..."
if docker compose up -d --build; then
    print_success "Containers started successfully"
else
    print_error "Failed to start containers"
    print_info "Check logs with: docker compose logs"
    exit 1
fi

echo ""
print_info "Waiting for services to be ready (30 seconds)..."
sleep 30

# Setup database
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 6: Setting Up Database"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_info "Generating Prisma client..."
docker compose exec backend npx prisma generate

print_info "Creating database schema..."
docker compose exec backend npx prisma db push

echo ""

# Seed data
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 7: Seeding Initial Data"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_info "1/5 Creating tenant..."
docker compose exec backend node scripts/seed.js

print_info "2/5 Creating roles and permissions..."
docker compose exec backend node scripts/seed-rbac.js

print_info "3/5 Creating document types..."
docker compose exec backend node scripts/seed-document-types.js

print_info "4/5 Creating workflows..."
docker compose exec backend node scripts/seed-workflows-simple.js

print_info "5/5 Creating organization structure..."
docker compose exec backend node scripts/seed-org-final.js

print_success "Database seeded successfully"

echo ""

# Configure firewall
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 8: Configuring Firewall"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v ufw &> /dev/null; then
    print_info "Configuring UFW firewall..."
    sudo ufw allow 3000/tcp comment 'E-Office Frontend'
    sudo ufw allow 4000/tcp comment 'E-Office Backend'
    print_success "Firewall configured"
elif command -v firewall-cmd &> /dev/null; then
    print_info "Configuring firewalld..."
    sudo firewall-cmd --permanent --add-port=3000/tcp
    sudo firewall-cmd --permanent --add-port=4000/tcp
    sudo firewall-cmd --reload
    print_success "Firewall configured"
else
    print_warning "No firewall detected. Please open ports 3000 and 4000 manually"
fi

echo ""

# Final status
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Installation Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_success "E-Office has been installed successfully!"
echo ""
echo "📍 Access Information:"
echo "   Frontend: $FRONTEND_URL"
echo "   Backend:  $BACKEND_URL"
echo ""
echo "👤 Default Login:"
echo "   Email:    admin@acme.local"
echo "   Password: admin123"
echo ""
echo "📚 Useful Commands:"
echo "   View logs:     docker compose logs -f"
echo "   Stop:          docker compose down"
echo "   Start:         docker compose up -d"
echo "   Restart:       docker compose restart"
echo "   Rebuild:       bash rebuild.sh"
echo ""
echo "📁 Installation Directory: $INSTALL_DIR"
echo ""
print_warning "IMPORTANT: Change default passwords after first login!"
echo ""
print_info "For more information, visit: http://$SERVER_IP:3000"
echo ""
