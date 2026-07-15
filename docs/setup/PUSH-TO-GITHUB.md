# 🚀 Hướng Dẫn Push Code Lên GitHub

## Bước 1: Tạo Repository trên GitHub

1. Vào https://github.com
2. Click nút **"New"** hoặc **"+"** → **"New repository"**
3. Điền thông tin:
   - **Repository name**: `wp-sign` hoặc `e-office`
   - **Description**: "Enterprise e-signature platform with RBAC"
   - **Visibility**: Chọn **Private** (nếu không muốn public)
   - **KHÔNG** tick "Initialize with README" (vì đã có rồi)
4. Click **"Create repository"**
5. Copy URL của repo (dạng: `https://github.com/username/wp-sign.git`)

## Bước 2: Chạy Các Lệnh Sau (Copy từng dòng)

Open PowerShell from the cloned repository root:

```powershell
# 1. Init git repository
git init

# 2. Add .gitignore trước (quan trọng!)
git add .gitignore
git commit -m "Add gitignore"

# 3. Add tất cả files
git add .

# 4. Commit
git commit -m "Initial commit: WP Sign e-signature platform with RBAC system"

# 5. Đổi branch thành main (nếu cần)
git branch -M main

# 6. Add remote (THAY <URL> bằng URL repo của bạn)
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git

# 7. Push lên GitHub
git push -u origin main
```

## Bước 3: Nhập Thông Tin Đăng Nhập

Khi push, Git sẽ hỏi:
- **Username**: Tên GitHub của bạn
- **Password**: Dùng **Personal Access Token** (không phải password thường)

### Tạo Personal Access Token:
1. Vào GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Chọn scopes: `repo` (full control)
4. Copy token và dùng làm password

## ⚠️ QUAN TRỌNG - Kiểm Tra Trước Khi Push:

```powershell
# Xem file nào sẽ được push
git status

# Đảm bảo KHÔNG có:
# - backend/.env
# - frontend/.env.local
# - license-server/.env
# - node_modules/
# - uploads/
```

## 🎉 Xong!

Sau khi push xong, vào GitHub repo của bạn sẽ thấy code đã lên!

## 🔧 Nếu Gặp Lỗi:

### Lỗi: "failed to push some refs"
```powershell
git pull origin main --rebase
git push -u origin main
```

### Lỗi: "remote origin already exists"
```powershell
git remote remove origin
git remote add origin <URL-mới>
```

### Lỗi: Authentication failed
- Dùng Personal Access Token thay vì password
- Hoặc setup SSH key

## 📝 Sau Khi Push:

1. Vào GitHub repo
2. Check file README.md hiển thị đẹp không
3. Verify không có file `.env` trong repo
4. Add description và topics cho repo
5. (Optional) Setup GitHub Actions cho CI/CD

---

**Cần giúp gì thêm? Hỏi mình nhé! 😊**
