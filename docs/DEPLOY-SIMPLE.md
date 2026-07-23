# 🚀 Deploy Đơn Giản Lên VPS

> **Hướng dẫn lỗi thời.** Không dùng các tên container, giá trị môi trường,
> `prisma db push`, seed hoặc backup bên dưới. Hướng dẫn được hỗ trợ là
> [`../INSTALL-PRODUCTION.md`](../INSTALL-PRODUCTION.md).

Hướng dẫn deploy nhanh nhất, đơn giản nhất.

---

## Bước 1: Chuẩn bị VPS (5 phút)

```bash
# SSH vào VPS
ssh root@your-vps-ip

# Cài Docker (1 lệnh)
curl -fsSL https://get.docker.com | sh

# Cài Docker Compose
apt install docker-compose-plugin -y

# Xong!
```

---

## Bước 2: Clone Code (1 phút)

```bash
cd /opt
git clone https://github.com/dinhvansh/e-office.git
cd e-office
```

---

## Bước 3: Setup Environment (2 phút)

```bash
# Backend
cd backend
cp .env.example .env
nano .env
```

**Chỉ cần sửa 3 dòng này:**
```env
DATABASE_URL="postgresql://postgres:postgres123@postgres:5432/eoffice"
JWT_SECRET="thay-bang-chuoi-bat-ky-dai-dai"
CORS_ORIGIN="http://your-vps-ip:3000"
```

```bash
# Frontend
cd ../frontend
cp .env.example .env.local
nano .env.local
```

**Chỉ 1 dòng:**
```env
NEXT_PUBLIC_API_URL=http://your-vps-ip:4000
```

---

## Bước 4: Chạy! (2 phút)

```bash
cd /opt/e-office

# Start tất cả
docker compose up -d

# Đợi 30 giây rồi setup database
docker exec -it e-sign-backend npx prisma migrate deploy
docker exec -it e-sign-backend node scripts/seed.js
docker exec -it e-sign-backend node scripts/seed-rbac.js
docker exec -it e-sign-backend node scripts/seed-document-types.js
```

---

## Xong! 🎉

Truy cập:
- **Frontend**: http://your-vps-ip:3000
- **Backend**: http://your-vps-ip:4000

Login:
- Email: `admin@acme.local`
- Password: the unique value supplied through `DEMO_ADMIN_PASSWORD`

---

## Bonus: Dùng Domain + SSL (Tùy chọn)

Nếu có domain (ví dụ: `eoffice.com`):

```bash
# Cài Nginx
apt install nginx certbot python3-certbot-nginx -y

# Tạo config
nano /etc/nginx/sites-available/eoffice
```

Paste vào:
```nginx
server {
    server_name eoffice.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
}

server {
    server_name api.eoffice.com;
    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
    }
}
```

```bash
# Enable
ln -s /etc/nginx/sites-available/eoffice /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# SSL tự động
certbot --nginx -d eoffice.com -d api.eoffice.com
```

Xong! Giờ truy cập:
- https://eoffice.com
- https://api.eoffice.com

---

## Các Lệnh Hay Dùng

```bash
# Xem logs
docker compose logs -f

# Restart
docker compose restart

# Stop
docker compose down

# Update code mới
cd /opt/e-office
git pull
docker compose up -d --build

# Backup database
docker exec e-sign-postgres pg_dump -U postgres eoffice > backup.sql
```

---

## Troubleshooting

**Lỗi port đã dùng?**
```bash
# Tìm process đang dùng port
lsof -i :3000
lsof -i :4000

# Kill nó
kill -9 <PID>
```

**Container không start?**
```bash
docker compose logs backend
docker compose restart
```

**Hết dung lượng?**
```bash
docker system prune -a
```

---

**Chỉ 4 bước, 10 phút là xong!** 🚀
