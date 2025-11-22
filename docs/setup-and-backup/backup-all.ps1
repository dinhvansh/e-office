# Backup All - Script tổng hợp backup database và files
# Chạy: .\backup-all.ps1

Write-Host "🔄 Starting full backup process..." -ForegroundColor Cyan
Write-Host ""

# 1. Backup Database
Write-Host "📊 Step 1: Backing up database..." -ForegroundColor Yellow
Set-Location backend
node scripts/backup-database.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Database backup failed!" -ForegroundColor Red
    exit 1
}
Set-Location ..
Write-Host ""

# 2. Create backup directory with timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = "backup-$timestamp"
Write-Host "📁 Step 2: Creating backup directory: $backupDir" -ForegroundColor Yellow
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Write-Host ""

# 3. Copy database backup
Write-Host "📦 Step 3: Copying database backup..." -ForegroundColor Yellow
$latestBackup = Get-ChildItem -Path "backend\backups" -Filter "database-backup-*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($latestBackup) {
    Copy-Item $latestBackup.FullName -Destination "$backupDir\database-backup.json"
    Write-Host "   ✅ Database backup copied: $($latestBackup.Name)" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  No database backup found!" -ForegroundColor Yellow
}
Write-Host ""

# 4. Copy storage files
Write-Host "📦 Step 4: Copying storage files..." -ForegroundColor Yellow
if (Test-Path "backend\storage") {
    Copy-Item -Path "backend\storage" -Destination "$backupDir\storage" -Recurse -Force
    $fileCount = (Get-ChildItem -Path "$backupDir\storage" -Recurse -File).Count
    Write-Host "   ✅ Storage files copied: $fileCount files" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  No storage directory found!" -ForegroundColor Yellow
}
Write-Host ""

# 5. Copy environment files (templates only, not actual .env)
Write-Host "📦 Step 5: Copying environment templates..." -ForegroundColor Yellow
Copy-Item "backend\.env.example" -Destination "$backupDir\backend.env.example" -ErrorAction SilentlyContinue
Copy-Item "frontend\.env.example" -Destination "$backupDir\frontend.env.example" -ErrorAction SilentlyContinue
Copy-Item "license-server\.env.example" -Destination "$backupDir\license-server.env.example" -ErrorAction SilentlyContinue
Write-Host "   ✅ Environment templates copied" -ForegroundColor Green
Write-Host ""

# 6. Create README for backup
Write-Host "📝 Step 6: Creating backup README..." -ForegroundColor Yellow
$readmeContent = @"
# E-Office Backup - $timestamp

## Nội dung backup

1. **database-backup.json** - Full database backup
2. **storage/** - Uploaded files
3. **backend.env.example** - Backend environment template
4. **frontend.env.example** - Frontend environment template
5. **license-server.env.example** - License server environment template

## Cách restore trên máy mới

### 1. Clone project
``````bash
git clone https://github.com/dinhvansh/e-office.git
cd e-office
``````

### 2. Setup môi trường
Xem file: SETUP-NEW-MACHINE.md

### 3. Restore database
``````bash
cd backend
# Copy file database-backup.json vào backend/backups/
node scripts/restore-database.js database-backup.json
``````

### 4. Restore storage files
``````bash
# Copy thư mục storage/ vào backend/storage/
``````

### 5. Cấu hình .env
- Copy các file .env.example thành .env
- Cập nhật các giá trị cần thiết (database URL, JWT secrets, etc.)

### 6. Start servers
``````bash
.\start-all.ps1
``````

## Thông tin backup

- **Ngày tạo**: $timestamp
- **Database**: PostgreSQL
- **Files**: Uploaded documents
- **Version**: Latest from main branch

## Lưu ý

- File .env thực tế KHÔNG được backup (bảo mật)
- Cần tạo lại JWT secrets cho production
- Cần cấu hình lại SMTP nếu dùng email service
"@

Set-Content -Path "$backupDir\README.md" -Value $readmeContent
Write-Host "   ✅ README created" -ForegroundColor Green
Write-Host ""

# 7. Create ZIP archive (optional)
Write-Host "📦 Step 7: Creating ZIP archive..." -ForegroundColor Yellow
$zipFile = "$backupDir.zip"
Compress-Archive -Path $backupDir -DestinationPath $zipFile -Force
$zipSize = [math]::Round((Get-Item $zipFile).Length / 1MB, 2)
Write-Host "   ✅ ZIP created: $zipFile ($zipSize MB)" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "✅ Backup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Backup Summary:" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "   📁 Directory: $backupDir" -ForegroundColor White
Write-Host "   📦 ZIP file: $zipFile" -ForegroundColor White
Write-Host "   💾 Size: $zipSize MB" -ForegroundColor White
Write-Host "─────────────────────────────────────────────" -ForegroundColor Gray
Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Copy file $zipFile sang máy mới" -ForegroundColor White
Write-Host "   2. Extract ZIP file" -ForegroundColor White
Write-Host "   3. Đọc file README.md trong backup" -ForegroundColor White
Write-Host "   4. Follow hướng dẫn trong SETUP-NEW-MACHINE.md" -ForegroundColor White
Write-Host ""
