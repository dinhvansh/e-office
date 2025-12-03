# 📦 Hướng Dẫn Cài Đặt E-Office

## 🚀 Cài Đặt Tự Động (Khuyến Nghị)

### Chỉ cần 1 lệnh duy nhất:

```bash
curl -fsSL https://raw.githubusercontent.com/dinhvansh/e-office/main/install.sh | sudo bash
```

**Hoặc tải về rồi chạy:**

```bash
wget https://raw.githubusercontent.com/dinhvansh/e-office/main/install.sh
sudo bash install.sh
```

### Script sẽ tự động:
- ✅ Cài Docker & Docker Compose
- ✅ Tải code từ GitHub
- ✅ Cấu hình tự động
- ✅ Khởi động dịch vụ
- ✅ Setup database
- ✅ Cài Nginx + SSL (nếu có domain)
- ✅ Cấu hình firewall
- ✅ Tạo lệnh quản lý `eoffice`

### Thời gian: ~5 phút

---

## 💻 Yêu Cầu Hệ Thống

### Tối Thiểu:
- **OS**: Ubuntu 20.04+ hoặc Debian 11+
- **RAM**: 2GB
- **CPU**: 1 core
- **Disk**: 20GB

### Khuyến Nghị:
- **OS**: Ubuntu 22.04 LTS
- **RAM**: 4GB+
- **CPU**: 2 cores+
- **Disk**: 50GB+

---

## 📋 Sau Khi Cài Đặt

### Truy cập ứng dụng:

**Nếu dùng IP:**
- Frontend: `http://your-ip:3000`
- Backend: `http://your-ip:4000`

**Nếu dùng domain:**
- Frontend: `https://yourdomain.com`
- Backend: `https://api.yourdomain.com`

### Đăng nhập lần đầu:
```
Email:    admin@acme.local
Password: secret123
```

⚠️ **QUAN TRỌNG - BẢO MẬT**: 
- Đây là mật khẩu mặc định CHỈ dùng cho lần đầu cài đặt
- **PHẢI đổi password ngay sau khi đăng nhập lần đầu**
- Xem hướng dẫn chi tiết trong [SECURITY.md](./SECURITY.md)

---

## 🛠️ Quản Lý Hệ Thống

Sau khi cài đặt, bạn có lệnh `eoffice` để quản lý:

```bash
# Khởi động
eoffice start

# Dừng
eoffice stop

# Khởi động lại
eoffice restart

# Xem logs
eoffice logs

# Xem trạng thái
eoffice status

# Cập nhật phiên bản mới
eoffice update

# Backup database
eoffice backup
```

---

## 📧 Cấu Hình Email (Tùy chọn)

Để gửi email thông báo, chỉnh sửa file:

```bash
nano /opt/e-office/backend/.env
```

**Ví dụ với Gmail:**
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="E-Office <your-email@gmail.com>"
```

Sau đó restart:
```bash
eoffice restart
```

---

## 🔄 Cập Nhật Phiên Bản Mới

```bash
eoffice update
```

Hoặc thủ công:
```bash
cd /opt/e-office
git pull origin main
docker compose up -d --build
docker exec e-sign-backend npx prisma migrate deploy
```

---

## 💾 Backup & Restore

### Backup:
```bash
# Tự động
eoffice backup

# Thủ công
docker exec e-sign-postgres pg_dump -U postgres eoffice > backup.sql
tar -czf storage-backup.tar.gz /opt/e-office/backend/storage
```

### Restore:
```bash
# Database
cat backup.sql | docker exec -i e-sign-postgres psql -U postgres -d eoffice

# Storage
tar -xzf storage-backup.tar.gz -C /
```

---

## 🐛 Xử Lý Sự Cố

### Kiểm tra logs:
```bash
eoffice logs
```

### Kiểm tra trạng thái:
```bash
eoffice status
docker ps
```

### Khởi động lại:
```bash
eoffice restart
```

### Container không start:
```bash
cd /opt/e-office
docker compose down
docker compose up -d
```

### Hết dung lượng:
```bash
# Dọn dẹp Docker
docker system prune -a

# Xóa backup cũ
find /opt/e-office/backups -mtime +30 -delete
```

### Reset hoàn toàn (XÓA TẤT CẢ DỮ LIỆU):
```bash
cd /opt/e-office
docker compose down -v
docker compose up -d
# Chạy lại setup database
```

---

## 🔒 Bảo Mật

### Đổi password admin:
1. Đăng nhập với `admin@acme.local / secret123`
2. Vào Settings → Change Password

### Cấu hình firewall:
```bash
# Chỉ cho phép SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### Backup định kỳ:
```bash
# Thêm vào crontab
crontab -e

# Backup hàng ngày lúc 2 giờ sáng
0 2 * * * /usr/local/bin/eoffice backup
```

---

## 📞 Hỗ Trợ

### Tài liệu:
- [Hướng dẫn sử dụng](docs/USER-GUIDE.md)
- [Hướng dẫn deploy](docs/DEPLOY-SIMPLE.md)
- [API Documentation](docs/api-spec.md)

### GitHub:
- Issues: https://github.com/dinhvansh/e-office/issues
- Discussions: https://github.com/dinhvansh/e-office/discussions

---

## 📝 Gỡ Cài Đặt

```bash
# Dừng và xóa containers
cd /opt/e-office
docker compose down -v

# Xóa code
rm -rf /opt/e-office

# Xóa lệnh quản lý
rm /usr/local/bin/eoffice

# Xóa Nginx config (nếu có)
rm /etc/nginx/sites-enabled/eoffice
rm /etc/nginx/sites-available/eoffice
systemctl reload nginx
```

---

## ⭐ Tính Năng

- ✅ Quản lý văn bản điện tử
- ✅ Phê duyệt đa cấp
- ✅ Ký số điện tử
- ✅ Quy trình workflow tùy chỉnh
- ✅ Phân quyền chi tiết (RBAC)
- ✅ Đánh số tự động
- ✅ Thông báo email
- ✅ Audit logs
- ✅ Multi-tenant

---

**Cảm ơn bạn đã sử dụng E-Office!** 🎉
