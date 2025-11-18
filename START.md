# ⚡ START - WP Sign

## 🎯 Chạy ngay (2 phút)

### Lần đầu tiên (Setup database):
```cmd
cd backend
npx prisma generate
npx prisma db push
npx prisma db seed
cd ..
```

### Chạy ứng dụng:
```cmd
npm install
npm run dev
```

**Xong!** 🎉

- Backend: http://localhost:4000
- Frontend: http://localhost:3000

---

## 🌐 Mở Browser

http://localhost:3000

**Login:**
- Email: `admin@tenant1.com`
- Password: `password123`

---

## 📧 Xem OTP

Khi send OTP, xem terminal:

```
[backend] 📧 [EMAIL] Would send email: {
[backend]   ...
[backend]   <div class="otp-code">123456</div>
[backend]   ...
[backend] }
```

Copy `123456` và paste vào UI.

---

## 🛑 Dừng

`Ctrl + C`

---

## 📚 Docs

- **[RUN-BOTH.md](RUN-BOTH.md)** - Chi tiết chạy cả 2
- **[HOW-TO-RUN.md](HOW-TO-RUN.md)** - Hướng dẫn đầy đủ
- **[SETUP-COMPLETE.md](SETUP-COMPLETE.md)** - Architecture
- **[README-TESTING.md](README-TESTING.md)** - Testing

---

**That's it!** 🚀
