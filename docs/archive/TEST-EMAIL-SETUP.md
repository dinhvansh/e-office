# Test Email Setup - Hướng Dẫn

## 📧 Thông tin Email Server

**Domain**: locautienphuoc.com  
**Email**: admin@locautienphuoc.com

### Cấu hình SMTP (Khuyến cáo - Bảo mật)
- **Host**: mail9066.maychuemail.com
- **Port**: 465 (SSL) hoặc 587 (STARTTLS)
- **SSL**: Yes
- **User**: admin@locautienphuoc.com
- **Password**: [Cần cập nhật]

### Cấu hình SMTP (Không bảo mật)
- **Host**: mail.locautienphuoc.com
- **Port**: 25
- **SSL**: No

---

## 🚀 Cách Test

### Bước 1: Cập nhật Password

Mở file `backend/.env` và cập nhật:

```env
SMTP_PASSWORD=your-actual-password-here
```

### Bước 2: Chạy Test Script

```bash
cd backend
node scripts/test-email-config.js
```

### Bước 3: Kiểm tra kết quả

✅ **Thành công**: Bạn sẽ thấy message "Email sent successfully"  
❌ **Thất bại**: Xem error message và troubleshooting tips

---

## 📝 Kết quả mong đợi

```
🔄 Testing email configuration...

📧 Email Configuration:
──────────────────────────────────────────────────
   Host: mail9066.maychuemail.com
   Port: 465
   Secure (SSL): true
   User: admin@locautienphuoc.com
   From: admin@locautienphuoc.com
   From Name: Lộc Âu Tiên Phước
──────────────────────────────────────────────────

🔌 Creating SMTP transporter...
🔍 Verifying SMTP connection...
✅ SMTP connection verified!

📨 Sending test email...
✅ Test email sent successfully!
```

---

## 🔧 Troubleshooting

### Lỗi: "Invalid login"
- Kiểm tra username/password
- Đảm bảo email account đã kích hoạt SMTP

### Lỗi: "Connection timeout"
- Kiểm tra firewall
- Thử port 587 thay vì 465
- Thử host không bảo mật: mail.locautienphuoc.com:25

### Lỗi: "Self signed certificate"
- Đã được xử lý với `rejectUnauthorized: false`
- Nếu vẫn lỗi, thử port 25 không SSL

---

## ✅ Sau khi test thành công

Email system sẽ tự động gửi:
- OTP codes
- Sign request notifications  
- Approval notifications
- Workflow updates

Không cần config thêm gì!
