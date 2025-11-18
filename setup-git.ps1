# Script để setup Git và push lên GitHub
# Chạy từ thư mục root: E:\2.CODE\PROJECT WP SIGN

Write-Host "🚀 Setting up Git repository..." -ForegroundColor Cyan
Write-Host ""

# 1. Init git
Write-Host "1. Initializing Git repository..." -ForegroundColor Yellow
git init
Write-Host "   ✅ Git initialized" -ForegroundColor Green
Write-Host ""

# 2. Add .gitignore first
Write-Host "2. Adding .gitignore..." -ForegroundColor Yellow
git add .gitignore
git commit -m "Add gitignore to protect sensitive files"
Write-Host "   ✅ .gitignore committed" -ForegroundColor Green
Write-Host ""

# 3. Check what will be added
Write-Host "3. Checking files to be added..." -ForegroundColor Yellow
Write-Host "   Files that will be committed:" -ForegroundColor Cyan
git add -n . | Select-Object -First 20
Write-Host "   ... (and more)" -ForegroundColor Gray
Write-Host ""

# 4. Confirm before adding
$confirm = Read-Host "   Do you want to continue? (y/n)"
if ($confirm -ne 'y') {
    Write-Host "   ❌ Aborted by user" -ForegroundColor Red
    exit 1
}

# 5. Add all files
Write-Host ""
Write-Host "4. Adding all files..." -ForegroundColor Yellow
git add .
Write-Host "   ✅ Files staged" -ForegroundColor Green
Write-Host ""

# 6. Show status
Write-Host "5. Git status:" -ForegroundColor Yellow
git status --short | Select-Object -First 30
Write-Host ""

# 7. Commit
Write-Host "6. Committing..." -ForegroundColor Yellow
git commit -m "Initial commit: WP Sign e-signature platform with RBAC system

Features:
- Multi-tenant architecture
- Document management & e-signature workflows
- RBAC system with departments, roles, permissions
- Email integration (OTP, notifications)
- License management
- Webhook support
- Audit logs
- Next.js frontend with TailwindCSS
- Express backend with Prisma ORM"

Write-Host "   ✅ Committed" -ForegroundColor Green
Write-Host ""

# 8. Rename branch to main
Write-Host "7. Renaming branch to main..." -ForegroundColor Yellow
git branch -M main
Write-Host "   ✅ Branch renamed" -ForegroundColor Green
Write-Host ""

# 9. Instructions for remote
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "✅ Git repository ready!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Create a new repository on GitHub:" -ForegroundColor Yellow
Write-Host "   - Go to https://github.com/new" -ForegroundColor White
Write-Host "   - Name: wp-sign or e-office" -ForegroundColor White
Write-Host "   - Visibility: Private (recommended)" -ForegroundColor White
Write-Host "   - DON'T initialize with README" -ForegroundColor White
Write-Host ""
Write-Host "2. Copy your repository URL, then run:" -ForegroundColor Yellow
Write-Host "   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git" -ForegroundColor White
Write-Host "   git push -u origin main" -ForegroundColor White
Write-Host ""
Write-Host "3. When prompted, use:" -ForegroundColor Yellow
Write-Host "   - Username: Your GitHub username" -ForegroundColor White
Write-Host "   - Password: Personal Access Token (not your password!)" -ForegroundColor White
Write-Host ""
Write-Host "Get token at: https://github.com/settings/tokens" -ForegroundColor Cyan
Write-Host ""
