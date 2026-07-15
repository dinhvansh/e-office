#!/bin/bash

# Script to completely rebuild Docker environment
# Use this when you want a fresh start

echo "🧹 Cleaning up Docker environment..."

# Stop all running containers
echo "Stopping containers..."
docker-compose down

# Remove all containers
echo "Removing containers..."
docker-compose rm -f

# Remove volumes (⚠️ This will delete database data!)
echo "Removing volumes..."
docker-compose down -v

# Remove images
echo "Removing images..."
docker-compose down --rmi all

# Clean up Docker system
echo "Cleaning Docker system..."
docker system prune -af --volumes

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "🔨 Building fresh containers..."

# Build and start with new configuration
docker-compose up -d --build

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 30

echo ""
echo "📦 Setting up database..."

# Generate Prisma client
docker-compose exec backend npx prisma generate

# Push database schema
docker-compose exec backend npx prisma db push

echo ""
echo "🌱 Seeding database..."

# Seed data in correct order
echo "1. Creating tenant..."
docker-compose exec backend node scripts/seed.js

echo "2. Creating RBAC (roles & permissions)..."
docker-compose exec backend node scripts/seed-rbac.js

echo "3. Creating document types..."
docker-compose exec backend node scripts/seed-document-types.js

echo "4. Creating workflows..."
docker-compose exec backend node scripts/seed-workflows-simple.js

echo "5. Creating organization structure..."
docker-compose exec backend node scripts/seed-org-final.js

echo ""
echo "✅ Docker rebuild complete!"
echo ""
echo "🌐 Access your application:"
echo "   Frontend: http://36.50.27.139:3000"
echo "   Backend:  http://36.50.27.139:4000"
echo ""
echo "👤 Default login:"
echo "   Email:    admin@acme.local"
echo "   Password: set DEMO_ADMIN_PASSWORD before running the seed"
echo ""
