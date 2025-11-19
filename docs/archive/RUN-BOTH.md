# 🚀 Chạy Backend + Frontend cùng lúc

## ✨ Cách mới: Chạy cả 2 trong 1 terminal

### Bước 0: Setup Database (chỉ làm 1 lần)

```cmd
cd backend
npx prisma generate
npx prisma db push
npx prisma db seed
cd ..
```

Chi tiết: [SETUP-DATABASE.md](SETUP-DATABASE.md)

### Bước 1: Cài đặt (chỉ làm 1 lần)

```cmd
npm install
```

### Bước 2: Chạy cả 2 cùng lúc

```cmd
npm run dev
```

Hoặc dùng CMD:
```cmd
cmd /c "npm run dev"
```

**Kết quả:**
- Backend sẽ chạy trên http://localhost:4000
- Frontend sẽ chạy trên http://localhost:3000
- Cả 2 logs sẽ hiển thị trong cùng 1 terminal

---

## 📊 Output sẽ như thế này:

```
[backend] 🚀 Server running on http://localhost:4000
[backend] ✅ Database connected
[backend] ✅ Redis connected
[frontend] ▲ Next.js 14.1.0
[frontend] - Local:   http://localhost:3000
[frontend] ✓ Ready in 5s
```

---

## 🎯 Xem OTP

Khi send OTP, bạn sẽ thấy trong cùng terminal:

```
[backend] 📧 [EMAIL] Would send email: {
[backend]   to: 'test@example.com',
[backend]   subject: 'Mã OTP ký tài liệu - ...',
[backend]   html: '...
[backend]     <div class="otp-code">123456</div>
[backend]   ...'
[backend] }
```

---

## 🛑 Dừng cả 2

Nhấn `Ctrl + C` trong terminal

---

## 🔄 Cách cũ: Chạy riêng (vẫn dùng được)

### Terminal 1: Backend
```cmd
cd backend
npm run dev
```

### Terminal 2: Frontend
```cmd
cd frontend
npm run dev
```

---

## 🐛 Troubleshooting

### Lỗi "concurrently not found"
```cmd
npm install
```

### Lỗi PowerShell execution policy
```cmd
cmd /c "npm run dev"
```

Hoặc mở PowerShell as Admin:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Port bị chiếm
```cmd
# Kill port 4000
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Kill port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## ✅ Checklist

- [ ] Docker containers chạy (db + redis)
- [ ] Chạy `npm install` (1 lần)
- [ ] Chạy `npm run dev`
- [ ] Backend chạy (port 4000)
- [ ] Frontend chạy (port 3000)
- [ ] Mở http://localhost:3000
- [ ] Login thành công
- [ ] Test flow: Upload → Sign → OTP

---

## 💡 Tips

1. **Xem logs dễ hơn**: Mỗi dòng có prefix `[backend]` hoặc `[frontend]`
2. **Tìm OTP nhanh**: Search `[backend] 📧` trong terminal
3. **Dừng cả 2**: Chỉ cần `Ctrl + C` 1 lần
4. **Restart**: `Ctrl + C` rồi chạy lại `npm run dev`

---

## 🎉 Xong!

Bây giờ bạn chỉ cần:
1. Chạy `npm run dev`
2. Mở http://localhost:3000
3. Test!

**Đơn giản hơn nhiều!** 🚀

---

**Quick Commands:**

```cmd
# Chạy cả 2
npm run dev

# Chỉ backend
npm run dev:backend

# Chỉ frontend
npm run dev:frontend

# Cài đặt tất cả dependencies
npm run install:all
```

**Test Account:**
- Email: `admin@tenant1.com`
- Password: `password123`
