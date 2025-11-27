# 🛑 Script Tắt Tất Cả Services
# WP Sign / E-Office System

Write-Host "🛑 Stopping WP Sign E-Office System..." -ForegroundColor Red
Write-Host ""

# Tắt Backend processes
Write-Host "🖥️  Stopping Backend..." -ForegroundColor Yellow
$backendProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*backend*" }
if ($backendProcesses) {
    $backendProcesses | Stop-Process -Force
    Write-Host "✅ Backend stopped" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No backend process found" -ForegroundColor Cyan
}
Write-Host ""

# Tắt Frontend processes
Write-Host "🌐 Stopping Frontend..." -ForegroundColor Yellow
$frontendProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*frontend*" }
if ($frontendProcesses) {
    $frontendProcesses | Stop-Process -Force
    Write-Host "✅ Frontend stopped" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No frontend process found" -ForegroundColor Cyan
}
Write-Host ""

# Tắt Database (tùy chọn)
Write-Host "🗄️  Stopping Database..." -ForegroundColor Yellow
Write-Host "   Do you want to stop database? (y/n)" -ForegroundColor Cyan
$response = Read-Host
if ($response -eq "y" -or $response -eq "Y") {
    docker-compose stop postgres redis
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database stopped" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to stop database" -ForegroundColor Red
    }
} else {
    Write-Host "ℹ️  Database kept running" -ForegroundColor Cyan
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Services stopped!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
