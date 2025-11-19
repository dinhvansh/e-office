# Script kiểm tra trước khi push lên GitHub
Write-Host "🔍 Checking project before GitHub push..." -ForegroundColor Cyan
Write-Host ""

$errors = 0
$warnings = 0

# 1. Check .gitignore exists
Write-Host "1. Checking .gitignore..." -ForegroundColor Yellow
if (Test-Path ".gitignore") {
    Write-Host "   ✅ .gitignore exists" -ForegroundColor Green
    
    # Check if .env is in gitignore
    $gitignoreContent = Get-Content ".gitignore" -Raw
    if ($gitignoreContent -match "\.env") {
        Write-Host "   ✅ .env is in .gitignore" -ForegroundColor Green
    } else {
        Write-Host "   ❌ .env NOT in .gitignore!" -ForegroundColor Red
        $errors++
    }
} else {
    Write-Host "   ❌ .gitignore NOT FOUND!" -ForegroundColor Red
    $errors++
}

# 2. Check for .env files in git
Write-Host ""
Write-Host "2. Checking for .env files in git..." -ForegroundColor Yellow
$envFiles = git ls-files | Select-String "\.env$"
if ($envFiles) {
    Write-Host "   ❌ DANGER! .env files found in git:" -ForegroundColor Red
    $envFiles | ForEach-Object { Write-Host "      - $_" -ForegroundColor Red }
    $errors++
} else {
    Write-Host "   ✅ No .env files in git" -ForegroundColor Green
}

# 3. Check for sensitive strings in code
Write-Host ""
Write-Host "3. Checking for sensitive data in code..." -ForegroundColor Yellow

$sensitivePatterns = @(
    @{Pattern="password\s*=\s*['\`"][^'\`"]+['\`"]"; Name="Hardcoded passwords"},
    @{Pattern="secret\s*=\s*['\`"][^'\`"]+['\`"]"; Name="Hardcoded secrets"},
    @{Pattern="api[_-]?key\s*=\s*['\`"][^'\`"]+['\`"]"; Name="API keys"}
)

foreach ($check in $sensitivePatterns) {
    $found = git grep -i $check.Pattern -- "*.ts" "*.js" "*.tsx" "*.jsx" 2>$null | 
             Where-Object { $_ -notmatch "\.env\.example" -and $_ -notmatch "\.example\." }
    
    if ($found) {
        Write-Host "   ⚠️  Possible $($check.Name) found:" -ForegroundColor Yellow
        $found | Select-Object -First 3 | ForEach-Object { 
            Write-Host "      $_" -ForegroundColor Yellow 
        }
        $warnings++
    }
}

if ($warnings -eq 0) {
    Write-Host "   ✅ No obvious sensitive data found" -ForegroundColor Green
}

# 4. Check node_modules in git
Write-Host ""
Write-Host "4. Checking for node_modules in git..." -ForegroundColor Yellow
$nodeModules = git ls-files | Select-String "node_modules"
if ($nodeModules) {
    Write-Host "   ❌ node_modules found in git!" -ForegroundColor Red
    $errors++
} else {
    Write-Host "   ✅ node_modules not in git" -ForegroundColor Green
}

# 5. Check uploads folder
Write-Host ""
Write-Host "5. Checking uploads folder..." -ForegroundColor Yellow
$uploads = git ls-files | Select-String "uploads/"
if ($uploads) {
    Write-Host "   ⚠️  uploads folder found in git" -ForegroundColor Yellow
    $warnings++
} else {
    Write-Host "   ✅ uploads folder not in git" -ForegroundColor Green
}

# 6. Check .env.example files exist
Write-Host ""
Write-Host "6. Checking .env.example files..." -ForegroundColor Yellow
$envExamples = @("backend/.env.example", "frontend/.env.example", "license-server/.env.example")
foreach ($file in $envExamples) {
    if (Test-Path $file) {
        Write-Host "   ✅ $file exists" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  $file not found" -ForegroundColor Yellow
        $warnings++
    }
}

# Summary
Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

if ($errors -eq 0 -and $warnings -eq 0) {
    Write-Host "✅ ALL CHECKS PASSED! Safe to push to GitHub." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  git add ." -ForegroundColor White
    Write-Host "  git commit -m 'Initial commit'" -ForegroundColor White
    Write-Host "  git remote add origin <your-repo-url>" -ForegroundColor White
    Write-Host "  git push -u origin main" -ForegroundColor White
    exit 0
} elseif ($errors -eq 0) {
    Write-Host "⚠️  $warnings warning(s) found. Review before pushing." -ForegroundColor Yellow
    Write-Host "   You may proceed with caution." -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "❌ $errors ERROR(S) found! DO NOT PUSH YET!" -ForegroundColor Red
    Write-Host "   Fix the errors above before pushing to GitHub." -ForegroundColor Red
    exit 1
}
