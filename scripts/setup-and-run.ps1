# 🚀 Script Setup & Chạy Toàn Bộ Hệ Thống E-Office
# Chạy phát hết từ đầu đến cuối!

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 E-OFFICE SYSTEM - AUTO SETUP & RUN" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# BƯỚC 1: KIỂM TRA MÔI TRƯỜNG
# ============================================
Write-Host "📋 STEP 1: Checking Environment..." -ForegroundColor Yellow
Write-Host ""

# Kiểm tra Node.js
Write-Host "   Checking Node.js..." -ForegroundColor Cyan
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -ne 0) { throw }
    Write-Host "   ✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Node.js NOT FOUND!" -ForegroundColor Red
    Write-Host "   📥 Please install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "   💡 Download LTS version (v20.x or v18.x)" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Kiểm tra npm
try {
    $npmVersion = npm --version 2>$null
    Write-Host "   ✅ npm: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  npm not found" -ForegroundColor Yellow
}

# Kiểm tra Docker
Write-Host "   Checking Docker..." -ForegroundColor Cyan
try {
    $dockerVersion = docker --version 2>$null
    if ($LASTEXITCODE -ne 0) { throw }
    Write-Host "   ✅ Docker: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Docker NOT FOUND!" -ForegroundColor Red
    Write-Host "   📥 Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Kiểm tra Docker đang chạy
Write-Host "   Checking Docker status..." -ForegroundColor Cyan
try {
    $dockerRunning = docker ps 2>$null
    if ($LASTEXITCODE -ne 0) { throw }
    Write-Host "   ✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Docker is NOT RUNNING!" -ForegroundColor Red
    Write-Host "   💡 Please start Docker Desktop and wait for it to be ready" -ForegroundColor Yellow
    Write-Host "   💡 Look for green icon in system tray" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# ============================================
# BƯỚC 2: CÀI ĐẶT DEPENDENCIES
# ============================================
Write-Host "📦 STEP 2: Installing Dependencies..." -ForegroundColor Yellow
Write-Host ""

# Backend
if (Test-Path "backend/node_modules") {
    Write-Host "   ✅ Backend dependencies already installed" -ForegroundColor Green
} else {
    Write-Host "   📥 Installing backend dependencies..." -ForegroundColor Cyan
    Set-Location backend
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Failed to install backend dependencies" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    Set-Location ..
    Write-Host "   ✅ Backend dependencies installed" -ForegroundColor Green
}

# Frontend
if (Test-Path "frontend/node_modules") {
    Write-Host "   ✅ Frontend dependencies already installed" -ForegroundColor Green
} else {
    Write-Host "   📥 Installing frontend dependencies..." -ForegroundColor Cyan
    Set-Location frontend
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Failed to install frontend dependencies" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    Set-Location ..
    Write-Host "   ✅ Frontend dependencies installed" -ForegroundColor Green
}

# License Server
if (Test-Path "license-server/node_modules") {
    Write-Host "   ✅ License server dependencies already installed" -ForegroundColor Green
} else {
    Write-Host "   📥 Installing license server dependencies..." -ForegroundColor Cyan
    Set-Location license-server
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Failed to install license server dependencies" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    Set-Location ..
    Write-Host "   ✅ License server dependencies installed" -ForegroundColor Green
}
Write-Host ""

# ============================================
# BƯỚC 3: KHỞI ĐỘNG DATABASE
# ============================================
Write-Host "🗄️  STEP 3: Starting Database..." -ForegroundColor Yellow
Write-Host ""

Write-Host "   Starting PostgreSQL + Redis..." -ForegroundColor Cyan
docker-compose up -d postgres redis
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Failed to start database" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Database containers started" -ForegroundColor Green

Write-Host "   ⏳ Waiting for database to be ready (10 seconds)..." -ForegroundColor Cyan
Start-Sleep -Seconds 10
Write-Host "   ✅ Database should be ready" -ForegroundColor Green
Write-Host ""

# ============================================
# BƯỚC 4: SETUP DATABASE SCHEMA & SEED DATA
# ============================================
Write-Host "🔧 STEP 4: Setting up Database Schema..." -ForegroundColor Yellow
Write-Host ""

Set-Location backend

# Kiểm tra xem đã setup chưa
$alreadySetup = $false
if (Test-Path ".setup-done") {
    Write-Host "   ℹ️  Database already setup. Skip? (Y/n)" -ForegroundColor Cyan
    $skip = Read-Host
    if ($skip -eq "" -or $skip -eq "Y" -or $skip -eq "y") {
        $alreadySetup = $true
        Write-Host "   ⏭️  Skipping database setup" -ForegroundColor Yellow
    }
}

if (-not $alreadySetup) {
    Write-Host "   📊 Running Prisma migrations..." -ForegroundColor Cyan
    npx prisma generate
    npx prisma db push
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Failed to run migrations" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    Write-Host "   ✅ Database schema created" -ForegroundColor Green

    Write-Host "   🌱 Seeding initial data..." -ForegroundColor Cyan
    node scripts/seed.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ⚠️  Warning: seed.js failed (might be okay if already seeded)" -ForegroundColor Yellow
    } else {
        Write-Host "   ✅ Basic data seeded" -ForegroundColor Green
    }

    Write-Host "   🌱 Seeding RBAC data..." -ForegroundColor Cyan
    node scripts/seed-rbac.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ⚠️  Warning: seed-rbac.js failed" -ForegroundColor Yellow
    } else {
        Write-Host "   ✅ RBAC data seeded" -ForegroundColor Green
    }

    Write-Host "   🌱 Seeding workflow data..." -ForegroundColor Cyan
    node scripts/seed-workflows.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ⚠️  Warning: seed-workflows.js failed" -ForegroundColor Yellow
    } else {
        Write-Host "   ✅ Workflow data seeded" -ForegroundColor Green
    }

    # Đánh dấu đã setup
    "Setup completed at $(Get-Date)" | Out-File -FilePath ".setup-done"
    Write-Host "   ✅ Database setup completed" -ForegroundColor Green
}

Set-Location ..
Write-Host ""

# ============================================
# BƯỚC 5: KHỞI ĐỘNG CÁC SERVICES
# ============================================
Write-Host "🚀 STEP 5: Starting Services..." -ForegroundColor Yellow
Write-Host ""

# License Server
Write-Host "   🔐 Starting License Server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd license-server; Write-Host '🔐 LICENSE SERVER (Port 3001)' -ForegroundColor Magenta; npm run dev"
Write-Host "   ✅ License server terminal opened" -ForegroundColor Green
Start-Sleep -Seconds 3

# Backend
Write-Host "   🖥️  Starting Backend API..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; Write-Host '🖥️  BACKEND API (Port 4000)' -ForegroundColor Blue; npm run dev"
Write-Host "   ✅ Backend terminal opened" -ForegroundColor Green
Start-Sleep -Seconds 8

# Frontend
Write-Host "   🌐 Starting Frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; Write-Host '🌐 FRONTEND (Port 3000)' -ForegroundColor Green; npm run dev"
Write-Host "   ✅ Frontend terminal opened" -ForegroundColor Green
Start-Sleep -Seconds 10

Write-Host ""

# ============================================
# HOÀN THÀNH!
# ============================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ SYSTEM STARTED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📊 SERVICE URLS:" -ForegroundColor Yellow
Write-Host "   🌐 Frontend:       http://localhost:3000" -ForegroundColor White
Write-Host "   🖥️  Backend API:    http://localhost:4000" -ForegroundColor White
Write-Host "   🔐 License Server: http://localhost:3001" -ForegroundColor White
Write-Host "   🗄️  PostgreSQL:     localhost:5432" -ForegroundColor White
Write-Host "   📦 Redis:          localhost:6379" -ForegroundColor White
Write-Host ""

Write-Host "🔐 LOGIN CREDENTIALS:" -ForegroundColor Yellow
Write-Host "   📧 Email:    admin@acme.local" -ForegroundColor White
Write-Host "   🔑 Password: password123" -ForegroundColor White
Write-Host ""

Write-Host "📚 USEFUL COMMANDS:" -ForegroundColor Yellow
Write-Host "   Stop all:     .\stop-all.ps1" -ForegroundColor White
Write-Host "   View logs:    Check the 3 opened terminals" -ForegroundColor White
Write-Host "   Reset DB:     cd backend; npx prisma db push --force-reset" -ForegroundColor White
Write-Host ""

Write-Host "🌐 Opening browser in 3 seconds..." -ForegroundColor Cyan
Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "✅ DONE! Happy coding! 🚀" -ForegroundColor Green
Write-Host "   Press Ctrl+C in each terminal to stop services" -ForegroundColor Yellow
Write-Host ""
