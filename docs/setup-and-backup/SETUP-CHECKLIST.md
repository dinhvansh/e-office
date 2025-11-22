# ✅ Setup Checklist - E-Office System

**Thời gian**: 30-45 phút  
**Độ khó**: Trung bình

---

## 📋 Pre-Setup Checklist

```
☐ Node.js v18+ installed (node --version)
☐ Docker Desktop installed & running (docker --version)
☐ Git installed (git --version)
☐ VS Code installed (optional)
☐ 10GB free disk space
☐ Internet connection (for npm install)
```

---

## 🚀 Setup Steps

### 1. Clone & Install (10 phút)

```powershell
☐ git clone https://github.com/dinhvansh/e-office.git
☐ cd e-office

# Backend
☐ cd backend && npm install

# Frontend  
☐ cd ../frontend && npm install

# License Server
☐ cd ../license-server && npm install
```

---

### 2. Fix TypeScript Errors (5 phút) ⚠️

```powershell
☐ cd backend
☐ node fix-all-errors.js
☐ npm run build  # Phải pass!
```

**Nếu lỗi**: Xem `docs/QUICK-FIX-TYPESCRIPT-ERRORS.md`

---

### 3. Start Docker (3 phút)

```powershell
☐ docker-compose up -d db redis
☐ timeout /t 5  # Đợi Postgres khởi động
☐ docker-compose ps  # Verify running
```

---

### 4. Setup Database (10 phút)

```powershell
☐ cd backend
☐ Copy-Item .env.example .env

# ⚠️ QUAN TRỌNG: Sửa DATABASE_URL
☐ Mở backend/.env
☐ Đổi: postgresql://esign:esignpass@localhost:5432/esign

☐ npx prisma generate
☐ npx prisma db push
☐ node scripts/setup-complete-database.js
```

---

### 5. Setup Frontend & License Server (2 phút)

```powershell
# Frontend
☐ cd frontend
☐ echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1" > .env.local

# License Server
☐ cd ../license-server
☐ echo "PORT=5000
LICENSE_SIGNING_SECRET=changeme-license-secret-for-dev
NODE_ENV=development" > .env
```

---

### 6. Start Servers (5 phút)

**Option A: Manual (3 terminals)**
```powershell
# Terminal 1
☐ cd license-server && npm run dev

# Terminal 2
☐ cd backend && npm run dev

# Terminal 3
☐ cd frontend && npm run dev
```

**Option B: Script (1 terminal)**
```powershell
☐ .\start-all.ps1
```

---

### 7. Verify System (5 phút)

```powershell
☐ Open http://localhost:3000
☐ Login: admin@acme.local / password123
☐ Check dashboard loads
☐ Check menu items visible
☐ Upload test document
```

---

## 🐛 Common Issues

### Issue 1: TypeScript Build Fails
```powershell
✅ cd backend
✅ node fix-all-errors.js
✅ npm run build
```

### Issue 2: Database Connection Failed
```powershell
✅ Check docker-compose ps
✅ Verify DATABASE_URL in backend/.env
✅ Restart: docker-compose restart db
```

### Issue 3: Port Already in Use
```powershell
✅ netstat -ano | findstr :4000
✅ taskkill /PID <PID> /F
```

### Issue 4: Login Failed
```powershell
✅ Check backend logs
✅ Verify seed ran: node scripts/check-admin-user.js
✅ Reset password: node scripts/reset-admin-password.js
```

---

## 📊 Success Criteria

```
✅ Docker: 2 containers running (db, redis)
✅ Backend: http://localhost:4000/health returns 200
✅ Frontend: http://localhost:3000 loads
✅ License Server: http://localhost:5000/health returns 200
✅ Login: admin@acme.local works
✅ Dashboard: Shows metrics
✅ Documents: Can upload file
```

---

## 🔗 Quick Links

- Full Guide: `docs/SETUP-EXPERIENCE-2025-11-22.md`
- TypeScript Fix: `docs/QUICK-FIX-TYPESCRIPT-ERRORS.md`
- Backup Guide: `docs/setup-and-backup/README.md`
- Architecture: `CODE-MAP.md`

---

**Last Updated**: 2025-11-22
