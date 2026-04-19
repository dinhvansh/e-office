#!/bin/bash

set -e

echo "E-Office Quick Deploy"
echo "====================="
echo

if [ "$EUID" -ne 0 ]; then
    echo "Vui long chay voi sudo:"
    echo "  sudo bash quick-deploy.sh"
    exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
    echo "Dang cai Docker..."
    curl -fsSL https://get.docker.com | sh
    apt install docker-compose-plugin -y
    echo "Docker da cai xong"
else
    echo "Docker da co san"
fi

VPS_IP=$(curl -s ifconfig.me)
echo
echo "VPS IP: $VPS_IP"
echo

echo "Dang setup environment..."

if [ ! -f .env ]; then
    cp .env.compose.example .env
    DB_PASSWORD=$(openssl rand -hex 16)
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|g" .env
    sed -i "s|^REFRESH_TOKEN_SECRET=.*|REFRESH_TOKEN_SECRET=$(openssl rand -hex 32)|g" .env
    sed -i "s|^LICENSE_SIGNING_SECRET=.*|LICENSE_SIGNING_SECRET=$(openssl rand -hex 24)|g" .env
    sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$DB_PASSWORD|g" .env
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://eoffice:$DB_PASSWORD@db:5432/eoffice_db|g" .env
    sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=http://$VPS_IP:3000|g" .env
    sed -i "s|^NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=http://$VPS_IP:4000/api/v1|g" .env
    sed -i "s|^NEXT_PUBLIC_API_BASE_URL=.*|NEXT_PUBLIC_API_BASE_URL=http://$VPS_IP:4000/api/v1|g" .env
    echo "Root .env created"
else
    echo "Root .env already exists, skip"
fi

echo
echo "Dang build va start containers..."
docker compose up -d --build

echo "Doi services khoi dong (30 giay)..."
sleep 30

echo
echo "Dang setup database..."
docker exec eoffice-backend npx prisma migrate deploy
docker exec eoffice-backend node scripts/seed.js
docker exec eoffice-backend node scripts/seed-rbac.js
docker exec eoffice-backend node scripts/seed-document-types.js
docker exec eoffice-backend node scripts/seed-workflows-simple.js

echo
echo "Deploy thanh cong"
echo
echo "Frontend: http://$VPS_IP:3000"
echo "Backend:  http://$VPS_IP:4000"
echo
echo "Dang nhap mac dinh:"
echo "  Email: admin@acme.local"
echo "  Password: secret123"
echo
echo "Lenh huu ich:"
echo "  docker compose logs -f"
echo "  docker compose restart"
echo "  docker compose down"
