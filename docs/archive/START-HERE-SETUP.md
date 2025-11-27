# 🚀 Start Here - Setup Guide

**Chào mừng đến với E-Office System!**

---

## 📍 Bạn Đang Ở Đâu?

### ✅ Tôi mới clone project lần đầu
→ Đi đến: **[docs/setup-and-backup/SETUP-CHECKLIST.md](docs/setup-and-backup/SETUP-CHECKLIST.md)**

### ✅ Tôi đang gặp lỗi khi setup
→ Đi đến: **[docs/setup-and-backup/QUICK-FIX-TYPESCRIPT-ERRORS.md](docs/setup-and-backup/QUICK-FIX-TYPESCRIPT-ERRORS.md)**

### ✅ Tôi muốn backup/restore hệ thống
→ Đi đến: **[docs/setup-and-backup/README.md](docs/setup-and-backup/README.md)**

### ✅ Tôi muốn xem tất cả tài liệu setup
→ Đi đến: **[docs/setup-and-backup/INDEX.md](docs/setup-and-backup/INDEX.md)**

---

## ⚡ Quick Commands

### Setup Lần Đầu (30-45 phút)

```powershell
# 1. Install dependencies
cd backend && npm install
cd ../frontend && npm install
cd ../license-server && npm install

# 2. Fix TypeScript errors
cd backend
node ../docs/setup-and-backup/fix-all-errors.js
npm run build

# 3. Start Docker
docker-compose up -d db redis
timeout /t 5

# 4. Setup database
cd backend
Copy-Item .env.example .env
# Edit .env: DATABASE_URL=postgresql://esign:esignpass@localhost:5432/esign
npx prisma generate
npx prisma db push
node scripts/setup-complete-database.js

# 5. Setup frontend & license server
cd ../frontend
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1" > .env.local

cd ../license-server
echo "PORT=5000
LICENSE_SIGNING_SECRET=changeme-license-secret-for-dev
NODE_ENV=development" > .env

# 6. Start servers
cd ../backend && npm run dev      # Terminal 1
cd ../frontend && npm run dev     # Terminal 2
cd ../license-server && npm run dev  # Terminal 3
```

### Backup Hệ Thống

```powershell
.\docs\setup-and-backup\backup-all.ps1
```

### Restore Database

```bash
cd backend
node ../docs/setup-and-backup/restore-database.js <backup-file.json>
```

---

## 📚 Tài Liệu Đầy Đủ

Tất cả tài liệu setup & backup nằm trong:
**[docs/setup-and-backup/](docs/setup-and-backup/)**

**Files chính**:
- `INDEX.md` - Quick index (start here!)
- `README.md` - Overview
- `SETUP-CHECKLIST.md` - Quick reference
- `SETUP-NEW-MACHINE.md` - Full guide
- `QUICK-FIX-TYPESCRIPT-ERRORS.md` - Error fixes
- `LESSONS-LEARNED-SETUP.md` - Lessons learned

---

## 🎯 Success Criteria

Sau khi setup xong, bạn sẽ có:

```
✅ Docker: 2 containers running (db, redis)
✅ Backend: http://localhost:4000/health
✅ Frontend: http://localhost:3000
✅ License Server: http://localhost:5000/health
✅ Login: admin@acme.local / password123
✅ Dashboard: Shows metrics
```

---

## 🆘 Cần Trợ Giúp?

1. **Lỗi TypeScript**: [QUICK-FIX-TYPESCRIPT-ERRORS.md](docs/setup-and-backup/QUICK-FIX-TYPESCRIPT-ERRORS.md)
2. **Setup issues**: [SETUP-EXPERIENCE-2025-11-22.md](docs/setup-and-backup/SETUP-EXPERIENCE-2025-11-22.md)
3. **Lessons learned**: [LESSONS-LEARNED-SETUP.md](docs/setup-and-backup/LESSONS-LEARNED-SETUP.md)
4. **Full guide**: [SETUP-NEW-MACHINE.md](docs/setup-and-backup/SETUP-NEW-MACHINE.md)

---

**Happy Coding!** 🚀

