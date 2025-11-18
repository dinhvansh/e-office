# ✅ Complete Setup - WP Sign

## 📋 Checklist đầy đủ

### 1. Docker ✅
- [x] PostgreSQL container chạy (port 5432)
- [x] Redis container chạy (port 6379)

```cmd
docker ps
```

Nếu chưa chạy:
```cmd
docker-compose up -d db redis
```

---

### 2. Backend Config ✅
- [x] File `backend/.env` đã được tạo
- [x] DATABASE_URL đúng: `postgresql://esign:esignpass@localhost:5432/esign`
- [x] Email config (dev mode - console log)

---

### 3. Database Setup 🔄
- [ ] Generate Prisma Client
- [ ] Push schema to database
- [ ] Seed test data

```cmd
cd backend
npx prisma generate
npx prisma db push
npx prisma db seed
cd ..
```

**Kết quả:**
- ✅ Tables created
- ✅ 2 tenants with users
- ✅ Test accounts ready

---

### 4. Install Dependencies 🔄
- [ ] Root dependencies (concurrently)
- [ ] Backend dependencies
- [ ] Frontend dependencies

```cmd
npm install
```

Hoặc install tất cả:
```cmd
npm run install:all
```

---

### 5. Run Application 🔄
- [ ] Backend running (port 4000)
- [ ] Frontend running (port 3000)

```cmd
npm run dev
```

**Chờ đến khi thấy:**
```
[backend] 🚀 Server running on http://localhost:4000
[backend] ✅ Database connected
[frontend] ▲ Next.js 14.1.0
[frontend] - Local:   http://localhost:3000
```

---

### 6. Test 🔄
- [ ] Mở http://localhost:3000
- [ ] Login: `admin@tenant1.com` / `password123`
- [ ] Upload document
- [ ] Create sign request
- [ ] Send OTP (xem terminal)
- [ ] Sign document

---

## 🚀 Quick Commands

### First Time Setup
```cmd
# 1. Start Docker
docker-compose up -d db redis

# 2. Setup Database
cd backend
npx prisma generate
npx prisma db push
npx prisma db seed
cd ..

# 3. Install & Run
npm install
npm run dev
```

### Daily Use
```cmd
# Just run
npm run dev
```

---

## 📊 Services Overview

| Service | Status | Port | URL |
|---------|--------|------|-----|
| PostgreSQL | ✅ Docker | 5432 | localhost:5432 |
| Redis | ✅ Docker | 6379 | localhost:6379 |
| Backend | 🔄 npm | 4000 | http://localhost:4000 |
| Frontend | 🔄 npm | 3000 | http://localhost:3000 |

---

## 🔍 Verify Setup

### Check Docker
```cmd
docker ps
```
→ Phải thấy `projectwpsign-db-1` và `projectwpsign-redis-1`

### Check Database
```cmd
cd backend
npx prisma studio
```
→ Mở http://localhost:5555, phải thấy tables và data

### Check Backend
```cmd
curl http://localhost:4000/api/v1/tenants/me
```
→ Phải trả về 401 (chưa login - đúng!)

### Check Frontend
→ Mở http://localhost:3000, phải thấy login page

---

## 🐛 Common Issues

### "Can't reach database server"
```cmd
docker-compose up -d db redis
docker ps
```

### "Prisma Client not generated"
```cmd
cd backend
npx prisma generate
```

### "Port already in use"
```cmd
# Kill port 4000
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Kill port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### "npm.ps1 cannot be loaded"
→ Dùng CMD thay vì PowerShell!

---

## 📧 Email Configuration

### Dev Mode (Default) ✅
- Email logged to console
- No SMTP config needed
- Perfect for testing

### Production Mode (Optional)
Edit `backend/.env`:
```env
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

Chi tiết: [docs/email-setup.md](docs/email-setup.md)

---

## 🎯 Test Accounts

After seeding:
- **Tenant 1**: `admin@tenant1.com` / `password123`
- **Tenant 2**: `admin@tenant2.com` / `password123`

---

## ✅ Final Checklist

- [ ] Docker containers running
- [ ] `backend/.env` exists
- [ ] Database schema pushed
- [ ] Test data seeded
- [ ] Dependencies installed
- [ ] Backend running (4000)
- [ ] Frontend running (3000)
- [ ] Can login to UI
- [ ] Can upload document
- [ ] Can create sign request
- [ ] Can send OTP (see console)
- [ ] Can sign document

---

## 🎉 All Done!

Bây giờ bạn có:
- ✅ Full stack running
- ✅ Database ready
- ✅ Email service working
- ✅ Test accounts ready
- ✅ Documentation complete

**Start testing!** 🚀

---

## 📚 Next Steps

- [START.md](START.md) - Quick start
- [RUN-BOTH.md](RUN-BOTH.md) - Run both services
- [SETUP-DATABASE.md](SETUP-DATABASE.md) - Database details
- [README-TESTING.md](README-TESTING.md) - Testing guide
- [docs/email-setup.md](docs/email-setup.md) - Email config

---

**Quick Start:**
```cmd
npm run dev
```

**Test Account:**
- Email: `admin@tenant1.com`
- Password: `password123`

**URLs:**
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- Prisma Studio: http://localhost:5555 (after `npx prisma studio`)
