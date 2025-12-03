# Quick Docker Test Script for Windows
# E-Office Docker Quick Test

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "E-Office Docker Quick Test" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# Check Docker
Write-Host "`n[1/8] Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✓ Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker not found. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Check Docker Compose
Write-Host "`n[2/8] Checking Docker Compose..." -ForegroundColor Yellow
try {
    $composeVersion = docker-compose --version
    Write-Host "✓ Docker Compose found: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose not found." -ForegroundColor Red
    exit 1
}

# Stop existing containers
Write-Host "`n[3/8] Stopping existing containers..." -ForegroundColor Yellow
docker-compose down
Write-Host "✓ Containers stopped" -ForegroundColor Green

# Build images
Write-Host "`n[4/8] Building Docker images (this may take 5-10 minutes)..." -ForegroundColor Yellow
docker-compose build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Build successful" -ForegroundColor Green

# Start services
Write-Host "`n[5/8] Starting services..." -ForegroundColor Yellow
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start services" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Services started" -ForegroundColor Green

# Wait for services
Write-Host "`n[6/8] Waiting for services to be ready..." -ForegroundColor Yellow
Write-Host "Waiting for database..."
Start-Sleep -Seconds 10

Write-Host "Waiting for backend..."
$backendReady = $false
for ($i = 1; $i -le 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4000/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ Backend is ready" -ForegroundColor Green
            $backendReady = $true
            break
        }
    } catch {
        # Continue waiting
    }
    Start-Sleep -Seconds 2
}

if (-not $backendReady) {
    Write-Host "❌ Backend failed to start" -ForegroundColor Red
    docker-compose logs backend
    exit 1
}

Write-Host "Waiting for frontend..."
$frontendReady = $false
for ($i = 1; $i -le 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ Frontend is ready" -ForegroundColor Green
            $frontendReady = $true
            break
        }
    } catch {
        # Continue waiting
    }
    Start-Sleep -Seconds 2
}

if (-not $frontendReady) {
    Write-Host "❌ Frontend failed to start" -ForegroundColor Red
    docker-compose logs frontend
    exit 1
}

# Setup database
Write-Host "`n[7/8] Setting up database..." -ForegroundColor Yellow
Write-Host "Running Prisma migrations..."
docker-compose exec -T backend npx prisma db push

Write-Host "Running seeds..."
docker-compose exec -T backend node scripts/seed-rbac.js
docker-compose exec -T backend node scripts/seed-document-types.js
docker-compose exec -T backend node scripts/seed-workflows-simple.js
docker-compose exec -T backend node scripts/seed-org-final.js

Write-Host "✓ Database setup complete" -ForegroundColor Green

# Show status
Write-Host "`n[8/8] Checking container status..." -ForegroundColor Yellow
docker-compose ps

# Final message
Write-Host "`n===================================" -ForegroundColor Green
Write-Host "✓ Docker test complete!" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access the application:"
Write-Host "  Frontend: http://localhost:3000"
Write-Host "  Backend:  http://localhost:4000"
Write-Host "  Login:    admin@acme.local / admin123"
Write-Host ""
Write-Host "Useful commands:"
Write-Host "  docker-compose logs -f          # View all logs"
Write-Host "  docker-compose logs -f backend  # View backend logs"
Write-Host "  docker-compose down             # Stop all services"
Write-Host "  docker-compose restart backend  # Restart backend"
Write-Host ""
