# PowerShell script to completely rebuild Docker environment
# Use this when you want a fresh start

Write-Host "🧹 Cleaning up Docker environment..." -ForegroundColor Yellow

# Stop all running containers
Write-Host "Stopping containers..." -ForegroundColor Cyan
docker-compose down

# Remove all containers
Write-Host "Removing containers..." -ForegroundColor Cyan
docker-compose rm -f

# Remove volumes (⚠️ This will delete database data!)
Write-Host "Removing volumes..." -ForegroundColor Cyan
docker-compose down -v

# Remove images
Write-Host "Removing images..." -ForegroundColor Cyan
docker-compose down --rmi all

# Clean up Docker system
Write-Host "Cleaning Docker system..." -ForegroundColor Cyan
docker system prune -af --volumes

Write-Host ""
Write-Host "✅ Cleanup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🔨 Building fresh containers..." -ForegroundColor Yellow

# Build and start with new configuration
docker-compose up -d --build

Write-Host ""
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

Write-Host ""
Write-Host "📦 Setting up database..." -ForegroundColor Yellow

# Generate Prisma client
docker-compose exec backend npx prisma generate

# Push database schema
docker-compose exec backend npx prisma db push

Write-Host ""
Write-Host "🌱 Seeding database..." -ForegroundColor Yellow

# Seed data in correct order
Write-Host "1. Creating tenant..." -ForegroundColor Cyan
docker-compose exec backend node scripts/seed.js

Write-Host "2. Creating RBAC (roles & permissions)..." -ForegroundColor Cyan
docker-compose exec backend node scripts/seed-rbac.js

Write-Host "3. Creating document types..." -ForegroundColor Cyan
docker-compose exec backend node scripts/seed-document-types.js

Write-Host "4. Creating workflows..." -ForegroundColor Cyan
docker-compose exec backend node scripts/seed-workflows-simple.js

Write-Host "5. Creating organization structure..." -ForegroundColor Cyan
docker-compose exec backend node scripts/seed-org-final.js

Write-Host ""
Write-Host "✅ Docker rebuild complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Access your application:" -ForegroundColor Cyan
Write-Host "   Frontend: http://36.50.27.139:3000" -ForegroundColor White
Write-Host "   Backend:  http://36.50.27.139:4000" -ForegroundColor White
Write-Host ""
Write-Host "👤 Default login:" -ForegroundColor Cyan
Write-Host "   Email:    admin@acme.local" -ForegroundColor White
Write-Host "   Password: admin123" -ForegroundColor White
Write-Host ""
