# 🚀 Script Chạy Nhanh E-Office System

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 E-OFFICE - QUICK START" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kiểm tra Docker
Write-Host "📦 Checking Docker..." -ForegroundColor Yellow
docker ps >$null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker not running! Start Docker Desktop first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✅ Docker OK" -ForegroundColor Green
Write-Host ""

# Cài dependencies nếu chưa có
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow

if (-not (Test-Path "backend/node_modules")) {
    Write-Host "   Installing backend..." -ForegroundColor Cyan
    cd backend
    npm install
    cd ..
}

if (-not (Test-Path "frontend/node_modules")) {
    Write-Host "   Installing frontend..." -ForegroundColor Cyan
    cd frontend
    npm install
    cd ..
}

if (-not (Test-Path "license-server/node_modules")) {
    Write-Host "   Installing license-server..." -ForegroundColor Cyan
    cd license-server
    npm install
    cd ..
}

Write-Host "✅ Dependencies OK" -ForegroundColor Green
Write-Host ""

# Khởi động database
Write-Host "🗄️  Starting database..." -ForegroundColor Yellow
docker-compose up -d postgres redis
Write-Host "   Waiting 10 seconds..." -ForegroundColor Cyan
Start-Sleep -Seconds 10
Write-Host "✅ Database OK" -ForegroundColor Green
Write-Host ""

# Setup database (nếu chưa)
if (-not (Test-Path "backend/.setup-done")) {
    Write-Host "🔧 Setting up database..." -ForegroundColor Yellow
    cd backend
    
    Write-Host "   Running migrations..." -ForegroundColor Cyan
    npx prisma generate
    npx prisma db push
    
    Write-Host "   Seeding data..." -ForegroundColor Cyan
    node scripts/seed.js
    node scripts/seed-rbac.js
    node scripts/seed-workflows.js
    
    "Done" | Out-File ".setup-done"
    cd ..
    Write-Host "✅ Database setup OK" -ForegroundColor Green
} else {
    Write-Host "✅ Database already setup" -ForegroundColor Green
}
Write-Host ""

# Khởi động services
Write-Host "🚀 Starting services..." -ForegroundColor Yellow

Write-Host "   Starting License Server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd license-server; npm run dev"
Start-Sleep -Seconds 3

Write-Host "   Starting Backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"
Start-Sleep -Seconds 8

Write-Host "   Starting Frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ ALL STARTED!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "🖥️  Backend:   http://localhost:4000" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Login:" -ForegroundColor Yellow
Write-Host "   Email:    admin@acme.local" -ForegroundColor White
Write-Host "   Password: password123" -ForegroundColor White
Write-Host ""

Write-Host "Opening browser..." -ForegroundColor Cyan
Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"

Write-Host "✅ DONE! 🚀" -ForegroundColor Green
Write-Host ""
