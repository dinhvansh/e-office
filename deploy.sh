#!/bin/bash

# E-Office Quick Deployment Script
# Usage: ./deploy.sh [environment]
# Example: ./deploy.sh production

set -e

ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.prod.yml"

echo "🚀 Deploying E-Office to $ENVIRONMENT..."

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Build images
echo "🏗️  Building Docker images..."
docker compose -f $COMPOSE_FILE build --no-cache

# Stop old containers
echo "🛑 Stopping old containers..."
docker compose -f $COMPOSE_FILE down

# Start new containers
echo "▶️  Starting new containers..."
docker compose -f $COMPOSE_FILE up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Run database migrations
echo "🗄️  Running database migrations..."
docker exec eoffice-backend npx prisma migrate deploy

# Check if seed is needed (first deployment)
if docker exec eoffice-postgres psql -U eoffice_user -d eoffice_prod -c "SELECT COUNT(*) FROM tenants;" 2>/dev/null | grep -q " 0"; then
    echo "🌱 Seeding initial data..."
    docker exec eoffice-backend node scripts/seed.js
    docker exec eoffice-backend node scripts/seed-rbac.js
    docker exec eoffice-backend node scripts/seed-document-types.js
    docker exec eoffice-backend node scripts/seed-workflows-simple.js
fi

# Show status
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Service Status:"
docker compose -f $COMPOSE_FILE ps

echo ""
echo "📝 View logs:"
echo "  docker compose -f $COMPOSE_FILE logs -f"
echo ""
echo "🌐 Access your application:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:4000"
echo "  Health:   http://localhost:4000/health"
echo ""
echo "🔐 Default login:"
echo "  Email:    admin@acme.local"
echo "  Password: [Check INSTALL.md or contact admin]"
echo ""
echo "⚠️  Remember to change the default password immediately!"
