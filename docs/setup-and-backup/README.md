# Setup & Backup - E-Office System

**Thư mục này chứa tất cả tài liệu và scripts liên quan đến setup và backup hệ thống.**

---

## 📁 Nội Dung

### 1. Quick Start

#### `SETUP-CHECKLIST.md` ⭐
**Checklist setup nhanh (30-45 phút)**

**Nội dung**:
- Pre-setup requirements
- 7 bước setup chi tiết
- Common issues & quick fixes
- Success criteria
- Verification steps

**Khi nào dùng**: Setup lần đầu hoặc cần reference nhanh

---

### 2. Sample Data

#### `sample-database-backup.json` 💾
**Database backup mẫu với data đầy đủ**

**Nội dung** (329 records):
- 1 tenant (ACME Corporation)
- 37 departments (org structure)
- 15 positions (CEO, Manager, Staff...)
- 17 users (including admin)
- 5 roles + 39 permissions
- 8 document types
- 7 workflows + 14 steps
- 41 documents
- 14 approvals
- 13 sign requests

**Khi nào dùng**: Setup máy mới với data mẫu sẵn có

---

### 3. Setup Documentation

#### `SETUP-NEW-MACHINE.md` ⭐
**Hướng dẫn setup đầy đủ cho máy mới**
- 11 bước chi tiết (30-45 phút)
- Yêu cầu hệ thống
- Cài đặt dependencies
- Setup Docker (PostgreSQL + Redis)
- Database migration
- Data restore
- Environment configuration
- Server startup
- Verification checklist
- Troubleshooting guide

**Khi nào dùng**: Setup project lần đầu trên máy mới

#### `SETUP-EXPERIENCE-2025-11-22.md` 📖
**Full setup experience với troubleshooting**

**Nội dung**:
- Timeline chi tiết (47 phút)
- 24 lỗi gặp phải & solutions
- Statistics & metrics
- Best practices
- Recommendations

**Khi nào dùng**: Muốn hiểu sâu về setup process hoặc gặp lỗi phức tạp

---

### 4. Troubleshooting Guides

#### `QUICK-FIX-TYPESCRIPT-ERRORS.md` 🔧
**Fix 21 TypeScript errors tự động**

**Nội dung**:
- Auto-fix script (`fix-all-errors.js`)
- Chi tiết 21 lỗi & root causes
- Fix patterns
- Prevention tips

**Khi nào dùng**: Gặp TypeScript build errors

#### `LESSONS-LEARNED-SETUP.md` 💡
**Lessons learned & improvements**

**Nội dung**:
- 5 key learnings
- Improvements made
- Immediate/long-term recommendations
- Metrics comparison
- Future enhancements

**Khi nào dùng**: Review process, improve workflow

---

### 5. Fix Scripts

#### `fix-all-errors.js` 🤖
**Auto-fix TypeScript errors**

**Chức năng**:
- Fix 21 TypeScript errors tự động
- 7 files affected
- 5 phút execution time

**Cách dùng**:
```bash
cd backend
node ../docs/setup-and-backup/fix-all-errors.js
npm run build  # Verify
```

#### `fix-typescript-errors.js` 🔨
**Alternative fix script (simpler)**

**Cách dùng**:
```bash
cd backend
node ../docs/setup-and-backup/fix-typescript-errors.js
```

---

### 6. Backup Scripts

**Note**: Backup scripts nằm trong `backend/scripts/` để access Prisma Client

#### `backup-all.ps1` ⭐
**Script tổng hợp backup toàn bộ hệ thống**

**Chức năng**:
- Backup database (gọi backup-database.js)
- Copy storage files
- Copy environment templates
- Tạo README cho backup
- Tạo ZIP archive

**Cách dùng**:
```powershell
# Từ root directory
.\docs\setup-and-backup\backup-all.ps1
```

**Output**:
- `backup-YYYY-MM-DD_HH-MM-SS/` - Thư mục backup
- `backup-YYYY-MM-DD_HH-MM-SS.zip` - File ZIP (dễ transfer)

---

#### Database Backup/Restore Scripts

**Location**: `backend/scripts/`

- `backup-database.js` - Export database to JSON
- `restore-database.js` - Import database from JSON

**Cách dùng**:
```bash
# Backup
cd backend
node scripts/backup-database.js

# Restore
cd backend
node scripts/restore-database.js database-backup-2025-11-23T10-30-00.json
```

**Output**: `backend/backups/database-backup-YYYY-MM-DDTHH-MM-SS.json`

---

## 🚀 Quick Start Guides

### Setup Lần Đầu (Recommended)

```bash
# 1. Đọc checklist
cat docs/setup-and-backup/SETUP-CHECKLIST.md

# 2. Follow từng bước
# - Install dependencies
# - Fix TypeScript errors
# - Start Docker
# - Setup database
# - Start servers

# 3. Nếu gặp lỗi TypeScript
cd backend
node ../docs/setup-and-backup/fix-all-errors.js
npm run build
```

### Backup trên máy cũ

```powershell
# Chạy từ root directory
.\docs\setup-and-backup\backup-all.ps1
```

→ Tạo file `backup-YYYY-MM-DD_HH-MM-SS.zip`

### Setup trên máy mới

1. Clone project:
```bash
git clone https://github.com/dinhvansh/e-office.git
cd e-office
```

2. Follow hướng dẫn:
```bash
# Đọc file này
docs/setup-and-backup/SETUP-NEW-MACHINE.md
```

3. Restore data:
```bash
# Copy backup file vào backend/backups/
cd backend
node ../docs/setup-and-backup/restore-database.js database-backup.json
```

---

## 📊 Workflow Tổng Quan

```
┌─────────────────┐
│   Máy Cũ        │
│                 │
│ 1. Run backup   │
│    script       │
│                 │
│ 2. Get ZIP file │
└────────┬────────┘
         │
         │ Transfer ZIP
         │
         ▼
┌─────────────────┐
│   Máy Mới       │
│                 │
│ 1. Clone repo   │
│                 │
│ 2. Extract ZIP  │
│                 │
│ 3. Follow       │
│    SETUP guide  │
│                 │
│ 4. Restore DB   │
│                 │
│ 5. Start servers│
└─────────────────┘
```

---

## 🔧 Troubleshooting

### Lỗi: TypeScript Build Errors (21 errors)

**Giải pháp**:
```bash
cd backend
node ../docs/setup-and-backup/fix-all-errors.js
npm run build
```

**Chi tiết**: Xem `QUICK-FIX-TYPESCRIPT-ERRORS.md`

### Lỗi: "Cannot find backup file"

**Giải pháp**:
```bash
# Kiểm tra file có trong backend/backups/
ls backend/backups/

# Nếu không có, copy file vào đó
```

### Lỗi: "Prisma Client not generated"

**Giải pháp**:
```bash
cd backend
npx prisma generate
```

### Lỗi: "Database connection failed"

**Giải pháp**:
```bash
# Kiểm tra Docker
docker-compose ps

# Restart Docker services
docker-compose down
docker-compose up -d
```

---

## 📝 Lưu Ý Quan Trọng

### ⚠️ Security

1. **Không backup file .env thực tế** - Chỉ backup .env.example
2. **Generate lại JWT secrets** cho production
3. **Không commit backup files** lên Git (đã có trong .gitignore)

### 💡 Best Practices

1. **Backup thường xuyên** - Ít nhất 1 lần/tuần
2. **Test restore process** - Đảm bảo backup hoạt động
3. **Lưu backup ở nhiều nơi** - Local + Cloud storage
4. **Document changes** - Ghi chú khi có thay đổi lớn

### 📦 Backup Checklist

- [ ] Database backup (JSON file)
- [ ] Storage files (uploaded documents)
- [ ] Environment templates (.env.example)
- [ ] Custom configurations (nếu có)
- [ ] Test restore process

---

## 📂 File Structure

```
docs/setup-and-backup/
├── README.md                           # This file
│
├── SETUP-CHECKLIST.md                  # ⭐ Quick reference
├── SETUP-NEW-MACHINE.md                # ⭐ Full setup guide
├── SETUP-EXPERIENCE-2025-11-22.md      # Setup experience log
│
├── QUICK-FIX-TYPESCRIPT-ERRORS.md      # TypeScript fixes
├── LESSONS-LEARNED-SETUP.md            # Lessons learned
│
├── fix-all-errors.js                   # Auto-fix script
├── fix-typescript-errors.js            # Alternative fix
│
├── sample-database-backup.json         # Sample data (329 records)
├── backup-all.ps1                      # Full system backup
└── restore-database.js                 # Database restore
```

## 🔗 Tài Liệu Liên Quan

**Setup & Backup** (This folder):
- `SETUP-CHECKLIST.md` - Quick reference
- `SETUP-NEW-MACHINE.md` - Full guide
- `SETUP-EXPERIENCE-2025-11-22.md` - Experience log
- `QUICK-FIX-TYPESCRIPT-ERRORS.md` - Error fixes
- `LESSONS-LEARNED-SETUP.md` - Lessons learned

**Root Directory**:
- `../../QUICK-START.md` - Quick start guide
- `../../README-TESTING.md` - Testing guide
- `../../CODE-MAP.md` - Architecture
- `../../START-HERE-FOR-AI.md` - Development guide
- `../../AGENTS.md` - Session logs

**Other Docs**:
- `../dev/TASK-CHECKLIST-GUIDE.md` - Task implementation guide

---

## 📞 Hỗ Trợ

Nếu gặp vấn đề:
1. Đọc phần Troubleshooting trong `SETUP-NEW-MACHINE.md`
2. Check session logs trong `docs/dev/SESSION-*.md`
3. Tạo issue trên GitHub

---

**Last Updated**: 2025-11-23  
**Version**: 1.0.0  
**Maintainer**: Development Team
