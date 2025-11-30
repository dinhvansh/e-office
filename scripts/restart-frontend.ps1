# Restart Frontend Script
Write-Host "🔄 Restarting Frontend..." -ForegroundColor Cyan

# Kill all node processes (careful!)
Write-Host "⏹️  Stopping Node processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Remove .next cache
Write-Host "🗑️  Removing .next cache..." -ForegroundColor Yellow
if (Test-Path "frontend\.next") {
    Remove-Item -Recurse -Force "frontend\.next"
    Write-Host "✅ Cache cleared" -ForegroundColor Green
}

# Start frontend
Write-Host "🚀 Starting frontend..." -ForegroundColor Cyan
Set-Location frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"
Set-Location ..

Write-Host "Frontend restarted!" -ForegroundColor Green
Write-Host "Open: http://localhost:3000" -ForegroundColor Cyan
