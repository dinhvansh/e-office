# Setup & Backup - Quick Index

**Chọn tài liệu phù hợp với tình huống của bạn:**

---

## 🚀 Setup Lần Đầu

### Tôi muốn setup nhanh (30-45 phút)
→ **[SETUP-CHECKLIST.md](SETUP-CHECKLIST.md)**
- Quick reference checklist
- Step-by-step instructions
- Common issues & fixes

### Tôi muốn hướng dẫn chi tiết
→ **[SETUP-NEW-MACHINE.md](SETUP-NEW-MACHINE.md)**
- 11 bước setup đầy đủ
- Troubleshooting guide
- Verification steps

### Tôi gặp lỗi TypeScript khi build
→ **[QUICK-FIX-TYPESCRIPT-ERRORS.md](QUICK-FIX-TYPESCRIPT-ERRORS.md)**
- Auto-fix script
- 21 lỗi documented
- Fix patterns

---

## 💾 Backup & Restore

### Tôi muốn backup toàn bộ hệ thống
→ **[backup-all.ps1](backup-all.ps1)**
```powershell
.\docs\setup-and-backup\backup-all.ps1
```

### Tôi muốn backup chỉ database
→ **[Backend Scripts](../../backend/scripts/backup-database.js)**
```bash
cd backend
node scripts/backup-database.js
```

### Tôi muốn restore database
→ **[restore-database.js](restore-database.js)**
```bash
cd backend
node ../docs/setup-and-backup/restore-database.js <backup-file.json>
```

### Tôi muốn dùng sample data
→ **[sample-database-backup.json](sample-database-backup.json)**
- 329 records
- Full org structure
- Ready to use

---

## 🐛 Troubleshooting

### Build bị lỗi TypeScript (21 errors)
```bash
cd backend
node ../docs/setup-and-backup/fix-all-errors.js
npm run build
```

### Database connection failed
```bash
# Check docker-compose.yml credentials
# Update backend/.env
DATABASE_URL=postgresql://esign:esignpass@localhost:5432/esign
```

### Foreign key errors khi restore
```bash
# Dùng seed thay vì restore
cd backend
node scripts/setup-complete-database.js
```

---

## 📚 Học Hỏi & Cải Thiện

### Tôi muốn hiểu setup process
→ **[SETUP-EXPERIENCE-2025-11-22.md](SETUP-EXPERIENCE-2025-11-22.md)**
- Full timeline (47 phút)
- 24 lỗi & solutions
- Statistics & metrics

### Tôi muốn học từ kinh nghiệm
→ **[LESSONS-LEARNED-SETUP.md](LESSONS-LEARNED-SETUP.md)**
- 5 key learnings
- Improvements made
- Recommendations

---

## 📖 Tổng Quan

### Tôi muốn overview tất cả
→ **[README.md](README.md)**
- Tổng quan toàn bộ folder
- Quick start guides
- File structure
- Links to all docs

---

## 🔗 Quick Links

**Setup**:
- [SETUP-CHECKLIST.md](SETUP-CHECKLIST.md) - Quick reference
- [SETUP-NEW-MACHINE.md](SETUP-NEW-MACHINE.md) - Full guide

**Troubleshooting**:
- [QUICK-FIX-TYPESCRIPT-ERRORS.md](QUICK-FIX-TYPESCRIPT-ERRORS.md) - TypeScript fixes
- [LESSONS-LEARNED-SETUP.md](LESSONS-LEARNED-SETUP.md) - Lessons learned

**Scripts**:
- [fix-all-errors.js](fix-all-errors.js) - Auto-fix TypeScript
- [backup-all.ps1](backup-all.ps1) - Full backup
- [restore-database.js](restore-database.js) - Restore DB

**Data**:
- [sample-database-backup.json](sample-database-backup.json) - Sample data

---

**Last Updated**: 2025-11-22  
**Total Files**: 11 (6 docs + 3 scripts + 1 data + 1 index)

