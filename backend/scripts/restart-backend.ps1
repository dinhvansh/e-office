# Restart Backend Script
Write-Host "🔄 Restarting Backend..." -ForegroundColor Cyan

# Step 1: Generate Prisma Client
Write-Host "`n📦 Step 1: Generating Prisma Client..." -ForegroundColor Yellow
Set-Location backend
npx prisma generate

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Prisma generate failed!" -ForegroundColor Red
    Write-Host "⚠️  Please close any running backend processes and try again" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Prisma client generated successfully!" -ForegroundColor Green

# Step 2: Instructions for user
Write-Host "`n📝 Next Steps:" -ForegroundColor Cyan
Write-Host "1. If backend is running, stop it (Ctrl+C)" -ForegroundColor White
Write-Host "2. Run: npm run dev" -ForegroundColor White
Write-Host "3. Backend will start with updated Prisma client" -ForegroundColor White

Write-Host "`n✅ Ready to restart backend!" -ForegroundColor Green
