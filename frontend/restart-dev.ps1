# Restart Frontend Dev Server
Write-Host "🔄 Restarting Frontend Dev Server..." -ForegroundColor Cyan

# Remove .next cache
Write-Host "🗑️  Removing .next cache..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force .next
    Write-Host "✅ Cache cleared!" -ForegroundColor Green
}

# Kill existing node processes on port 3000
Write-Host "🔪 Killing processes on port 3000..." -ForegroundColor Yellow
$processes = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($processes) {
    foreach ($proc in $processes) {
        Stop-Process -Id $proc -Force -ErrorAction SilentlyContinue
    }
    Write-Host "✅ Processes killed!" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No process found on port 3000" -ForegroundColor Gray
}

# Wait a bit
Start-Sleep -Seconds 2

# Start dev server
Write-Host "🚀 Starting dev server..." -ForegroundColor Cyan
npm run dev
