# 🔧 E-Office Troubleshooting Guide

## Khi Nào Cần Clean Reset?

Sử dụng `clean-reset.sh` khi gặp các vấn đề sau:

### ❌ Containers không start được
```bash
Error: Cannot start container
Error: Port already in use
Error: Container name already exists
```

### ❌ Build errors
```bash
Error: failed to solve
Error: Cannot connect to Docker daemon
Error: Image build failed
```

### ❌ Database errors
```bash
Error: Connection refused
Error: Database does not exist
Error: Migration failed
```

### ❌ Network errors
```bash
Error: Network not found
Error: Cannot connect to network
```

### ❌ Volume errors
```bash
Error: Volume in use
Error: Cannot remove volume
```

## 🔄 Clean Reset Process

### Bước 1: Backup Data (Nếu Cần)

```bash
# Backup database
docker exec eoffice-db pg_dump -U eoffice_user eoffice_prod > backup.sql

# Backup storage
tar -czf storage-backup.tar.gz storage/

# Backup .env files
cp .env .env.backup
cp backend/.env backend/.env.backup
cp frontend/.env.local frontend/.env.local.backup
```

### Bước 2: Chạy Clean Reset

```bash
bash clean-reset.sh
```

Script sẽ hỏi xác nhận 2 lần:
1. Nhập `yes` để tiếp tục
2. Nhập `DELETE` để xác nhận

### Bước 3: Setup Lại

```bash
# Option 1: Auto setup (Khuyến nghị)
bash auto-setup.sh

# Option 2: Manual setup
docker compose build --no-cache
docker compose up -d
```

### Bước 4: Restore Data (Nếu Đã Backup)

```bash
# Wait for services
sleep 30

# Restore database
cat backup.sql | docker exec -i eoffice-db psql -U eoffice_user eoffice_prod

# Restore storage
tar -xzf storage-backup.tar.gz
```

## 🐛 Common Issues & Solutions

### Issue 1: Port Already in Use

**Triệu chứng:**
```
Error: bind: address already in use
```

**Giải pháp:**
```bash
# Check what's using the port
sudo lsof -i :3000
sudo lsof -i :4000
sudo lsof -i :5432

# Kill the process
sudo kill -9 <PID>

# Or change ports in docker-compose.yml
```

### Issue 2: Docker Daemon Not Running

**Triệu chứng:**
```
Cannot connect to the Docker daemon
```

**Giải pháp:**
```bash
# Start Docker
sudo systemctl start docker

# Enable Docker on boot
sudo systemctl enable docker

# Check status
sudo systemctl status docker
```

### Issue 3: Permission Denied

**Triệu chứng:**
```
permission denied while trying to connect to Docker daemon
```

**Giải pháp:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login again
# Or run:
newgrp docker

# Verify
docker ps
```

### Issue 4: Out of Disk Space

**Triệu chứng:**
```
no space left on device
```

**Giải pháp:**
```bash
# Check disk usage
df -h
docker system df

# Clean up Docker
docker system prune -a --volumes

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune
```

### Issue 5: Build Cache Issues

**Triệu chứng:**
```
Build fails with cached layers
Old code still running after rebuild
```

**Giải pháp:**
```bash
# Build without cache
docker compose build --no-cache

# Or use clean-reset.sh
bash clean-reset.sh
bash auto-setup.sh
```

### Issue 6: Database Connection Failed

**Triệu chứng:**
```
Error: connect ECONNREFUSED
Can't reach database server
```

**Giải pháp:**
```bash
# Check database container
docker compose ps db

# Check logs
docker compose logs db

# Restart database
docker compose restart db

# Check connection from backend
docker exec eoffice-backend npx prisma db pull
```

### Issue 7: Frontend Can't Connect Backend

**Triệu chứng:**
```
Network Error
Failed to fetch
CORS Error
```

**Giải pháp:**
```bash
# Check NEXT_PUBLIC_API_BASE_URL
docker exec eoffice-frontend env | grep NEXT_PUBLIC

# If wrong, rebuild frontend
docker compose build --no-cache frontend
docker compose up -d frontend

# Check CORS in backend
docker compose logs backend | grep -i cors
```

### Issue 8: Containers Keep Restarting

**Triệu chứng:**
```
Container exits immediately
Restart loop
```

**Giải pháp:**
```bash
# Check logs
docker compose logs <service-name>

# Check container status
docker compose ps

# Common causes:
# - Missing environment variables
# - Database not ready
# - Port conflicts
# - Application errors

# Fix and restart
docker compose restart <service-name>
```

## 🔍 Debugging Commands

### Check Everything

```bash
# Container status
docker compose ps

# All logs
docker compose logs

# Specific service logs
docker compose logs backend
docker compose logs frontend
docker compose logs db

# Follow logs
docker compose logs -f

# Last 100 lines
docker compose logs --tail=100

# Resource usage
docker stats

# Disk usage
docker system df
```

### Check Network

```bash
# List networks
docker network ls

# Inspect network
docker network inspect eoffice_default

# Test connectivity
docker exec eoffice-backend ping db
docker exec eoffice-backend ping redis
```

### Check Volumes

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect eoffice_db_data

# Check volume size
docker system df -v
```

### Check Environment

```bash
# Backend env
docker exec eoffice-backend env

# Frontend env
docker exec eoffice-frontend env | grep NEXT_PUBLIC

# Database connection
docker exec eoffice-backend npx prisma db pull
```

## 📋 Pre-Reset Checklist

Trước khi chạy `clean-reset.sh`, hãy kiểm tra:

- [ ] Đã backup database nếu cần
- [ ] Đã backup storage files nếu cần
- [ ] Đã backup .env files
- [ ] Đã backup .credentials.txt
- [ ] Hiểu rằng TẤT CẢ dữ liệu sẽ bị xóa
- [ ] Đã thử các giải pháp khác trước

## 🆘 Emergency Recovery

Nếu mọi thứ đều thất bại:

```bash
# 1. Complete clean
bash clean-reset.sh

# 2. Remove Docker completely (EXTREME)
sudo apt-get purge docker-ce docker-ce-cli containerd.io
sudo rm -rf /var/lib/docker
sudo rm -rf /var/lib/containerd

# 3. Reinstall Docker
curl -fsSL https://get.docker.com | sudo sh

# 4. Setup from scratch
bash auto-setup.sh
```

## 📞 Getting Help

Nếu vẫn gặp vấn đề:

1. **Check logs**: `docker compose logs -f`
2. **Check documentation**: `docs/`
3. **Search issues**: GitHub issues
4. **Ask for help**: Provide logs and error messages

## 🎯 Prevention Tips

Để tránh phải clean reset:

1. **Backup thường xuyên**
   ```bash
   # Daily backup script
   docker exec eoffice-db pg_dump -U eoffice_user eoffice_prod > backup-$(date +%Y%m%d).sql
   ```

2. **Monitor disk space**
   ```bash
   df -h
   docker system df
   ```

3. **Clean up regularly**
   ```bash
   docker system prune -f
   ```

4. **Use proper shutdown**
   ```bash
   docker compose down  # Not docker compose kill
   ```

5. **Keep Docker updated**
   ```bash
   sudo apt update
   sudo apt upgrade docker-ce
   ```

---

**Lưu ý**: `clean-reset.sh` là giải pháp cuối cùng. Hãy thử troubleshoot trước khi reset.
