#!/bin/bash

# E-Office - Quick Deploy Script
# Chạy trên VPS Ubuntu/Debian

set -e

echo "🚀 E-Office Quick Deploy"
echo "========================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Vui lòng chạy với sudo:"
    echo "   sudo bash quick-deploy.sh"
    exit 1
fi

# Install Docker if not exists
if ! command -v docker &> /dev/null; then
    echo "📦 Đang cài Docker..."
    curl -fsSL https://get.docker.com | sh
    apt install docker-compose-plugin -y
    echo "✅ Docker đã cài xong"
else
    echo "✅ Docker đã có sẵn"
fi

# Get VPS IP
VPS_IP=$(curl -s ifconfig.me)
echo ""
echo "🌐 VPS IP của bạn: $VPS_IP"
echo ""

# Setup environment files
echo "⚙️  Đang setup environment..."

# Backend .env
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"postgresql://postgres:postgres123@postgres:5432/eoffice\"|g" backend/.env
    sed -i "s|JWT_SECRET=.*|JWT_SECRET=\"$(openssl rand -hex 32)\"|g" backend/.env
    sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=\"http://$VPS_IP:3000\"|g" backend/.env
    echo "✅ Backend .env created"
fi

# Frontend .env.local
if [ ! -f frontend/.env.local ]; then
    echo "NEXT_PUBLIC_API_URL=http://$VPS_IP:4000" > frontend/.env.local
    echo "✅ Frontend .env.local created"
fi

# Start services
echo ""
echo "🐳 Đang start Docker containers..."
docker compose up -d

# Wait for services
echo "⏳ Đợi services khởi động (30 giây)..."
sleep 30

# Setup database
echo ""
echo "🗄️  Đang setup database..."
docker exec e-sign-backend npx prisma migrate deploy
docker exec e-sign-backend node scripts/seed.js
docker exec e-sign-backend node scripts/seed-rbac.js
docker exec e-sign-backend node scripts/seed-document-types.js
docker exec e-sign-backend node scripts/seed-workflows-simple.js

echo ""
echo "✅ DEPLOY THÀNH CÔNG!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Truy cập ứng dụng:"
echo "   Frontend: http://$VPS_IP:3000"
echo "   Backend:  http://$VPS_IP:4000"
echo ""
echo "🔐 Đăng nhập:"
echo "   Email:    admin@acme.local"
echo "   Password: secret123"
echo ""
echo "⚠️  Nhớ đổi password sau khi đăng nhập!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Các lệnh hữu ích:"
echo "   Xem logs:    docker compose logs -f"
echo "   Restart:     docker compose restart"
echo "   Stop:        docker compose down"
echo ""
