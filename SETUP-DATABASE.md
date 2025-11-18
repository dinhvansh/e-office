# 🗄️ Setup Database - WP Sign

## ✅ Đã làm sẵn cho bạn!

File `backend/.env` đã được tạo với config đúng để connect tới PostgreSQL Docker.

---

## 🐳 Kiểm tra Docker

```cmd
docker ps
```

Phải thấy:
- `projectwpsign-db-1` (PostgreSQL) - Up
- `projectwpsign-redis-1` (Redis) - Up

Nếu không thấy:
```cmd
docker-compose up -d db redis
```

---

## 🔧 Setup Database Schema

### Bước 1: Generate Prisma Client
```cmd
cd backend
npx prisma generate
```

### Bước 2: Push Schema to Database
```cmd
npx prisma db push
```

### Bước 3: Seed Data
```cmd
npx prisma db seed
```

**Kết quả:**
- ✅ Tables được tạo
- ✅ 2 tenants với users
- ✅ Test accounts ready

---

## 🧪 Test Connection

```cmd
cd backend
npx prisma studio
```

Mở http://localhost:5555 để xem database.

---

## 📝 Database Info

**Connection String:**
```
postgresql://esign:esignpass@localhost:5432/esign
```

**Credentials:**
- Host: `localhost`
- Port: `5432`
- User: `esign`
- Password: `esignpass`
- Database: `esign`

**Test Accounts (sau khi seed):**
- Tenant 1: `admin@tenant1.com` / `password123`
- Tenant 2: `admin@tenant2.com` / `password123`

---

## 🐛 Troubleshooting

### "Error: P1001: Can't reach database server"

**Nguyên nhân:** PostgreSQL Docker chưa chạy

**Giải pháp:**
```cmd
docker-compose up -d db redis
docker ps
```

### "Error: P3009: migrate.lock file is present"

**Giải pháp:**
```cmd
cd backend
del prisma\migrations\migration_lock.toml
npx prisma db push
```

### "Error: relation does not exist"

**Giải pháp:**
```cmd
cd backend
npx prisma db push --force-reset
npx prisma db seed
```

### Database bị lỗi, muốn reset

```cmd
cd backend
npx prisma migrate reset
npx prisma db seed
```

---

## 📊 Database Schema

### Tables
- `tenants` - Multi-tenant data
- `users` - User accounts
- `documents` - PDF documents
- `sign_requests` - Signing workflows
- `signers` - Individual signers
- `audit_logs` - Activity tracking
- `license` - On-premise licenses

### Relationships
```
tenants (1) → (N) users
tenants (1) → (N) documents
tenants (1) → (N) sign_requests
documents (1) → (N) sign_requests
sign_requests (1) → (N) signers
documents (1) → (N) audit_logs
```

---

## ✅ Checklist

- [x] Docker containers chạy (db + redis)
- [x] File `backend/.env` đã tạo
- [ ] Chạy `npx prisma generate`
- [ ] Chạy `npx prisma db push`
- [ ] Chạy `npx prisma db seed`
- [ ] Test với `npx prisma studio`

---

## 🎉 Xong!

Database đã sẵn sàng. Bây giờ có thể chạy backend:

```cmd
cd backend
npm run dev
```

Hoặc chạy cả 2:
```cmd
npm run dev
```

---

**Next:** [START.md](START.md) - Chạy ứng dụng
