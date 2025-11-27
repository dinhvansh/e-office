# 🚀 Script Tự Động Bật Tất Cả Services
# WP Sign / E-Office System

Write-Host "🚀 Starting WP Sign E-Office System..." -ForegroundColor Green
Write-Host ""

# Kiểm tra Docker
Write-Host "📦 Checking Docker..." -ForegroundColor Yellow
$dockerRunning = docker ps 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running! Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker is running" -ForegroundColor Green
Write-Host ""

# Khởi động Database
Write-Host "🗄️  Starting Database (PostgreSQL + Redis)..." -ForegroundColor Yellow
docker-compose up -d postgres redis
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database started successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to start database" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Đợi database khởi động
Write-Host "⏳ Waiting for database to be ready (5 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host "✅ Database should be ready" -ForegroundColor Green
Write-Host ""

# Khởi động Backend
Write-Host "🖥️  Starting Backend..." -ForegroundColor Yellow
Write-Host "   Opening new terminal for backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; Write-Host '🖥️  Backend Server' -ForegroundColor Green; npm run dev"
Write-Host "✅ Backend terminal opened" -ForegroundColor Green
Write-Host ""

# Đợi backend khởi động
Write-Host "⏳ Waiting for backend to start (8 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 8
Write-Host ""

# Khởi động Frontend
Write-Host "🌐 Starting Frontend..." -ForegroundColor Yellow
Write-Host "   Opening new terminal for frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; Write-Host '🌐 Frontend Server' -ForegroundColor Green; npm run dev"
Write-Host "✅ Frontend terminal opened" -ForegroundColor Green
Write-Host ""

# Đợi frontend khởi động
Write-Host "⏳ Waiting for frontend to start (8 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 8
Write-Host ""

# Hiển thị thông tin
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ All services started successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Service URLs:" -ForegroundColor Yellow
Write-Host "   Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "   Backend:   http://localhost:4000" -ForegroundColor White
Write-Host "   Database:  localhost:5432 (PostgreSQL)" -ForegroundColor White
Write-Host "   Redis:     localhost:6379" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Login Credentials:" -ForegroundColor Yellow
Write-Host "   Email:     admin@acme.local" -ForegroundColor White
Write-Host "   Password:  admin123" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Opening browser..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"
Write-Host ""
Write-Host "✅ Done! Check the opened terminals for logs." -ForegroundColor Green
Write-Host "   Press Ctrl+C in each terminal to stop services." -ForegroundColor Cyan
Write-Host ""
