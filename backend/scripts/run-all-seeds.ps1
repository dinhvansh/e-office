# Run all seed scripts in correct order
# Usage: cd backend; .\scripts\run-all-seeds.ps1

Write-Host "Running all seed scripts..." -ForegroundColor Green
Write-Host ""

# 1. RBAC (Tenant, Roles, Permissions, Basic Users)
Write-Host "[1/4] Running seed-rbac.js..." -ForegroundColor Cyan
node scripts/seed-rbac.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ seed-rbac.js failed!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 2. Document Types
Write-Host "[2/4] Running seed-document-types.js..." -ForegroundColor Cyan
node scripts/seed-document-types.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ seed-document-types.js failed!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 3. Workflows
Write-Host "[3/4] Running seed-workflows-simple.js..." -ForegroundColor Cyan
node scripts/seed-workflows-simple.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ seed-workflows-simple.js failed!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 4. Org Chart (Positions, Departments, Users with hierarchy)
Write-Host "[4/4] Running seed-org-chart-test.js..." -ForegroundColor Cyan
node scripts/seed-org-chart-test.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ seed-org-chart-test.js failed!" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "All seeds completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Test credentials:" -ForegroundColor Yellow
Write-Host "   Passwords are supplied through DEMO_ADMIN_PASSWORD"
Write-Host ""
Write-Host "Login at: http://localhost:3000/login" -ForegroundColor Cyan
