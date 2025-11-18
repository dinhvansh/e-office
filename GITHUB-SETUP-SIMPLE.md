# 🚀 Đẩy Code Lên GitHub - Hướng Dẫn Đơn Giản

## Chuẩn Bị:

1. **Tạo GitHub Repository:**
   - Vào: https://github.com/new
   - Tên repo: `wp-sign` hoặc `e-office`
   - Chọn **Private** (nếu không muốn public)
   - **KHÔNG** tick "Add README"
   - Click **Create repository**
   - **Copy URL** của repo (ví dụ: `https://github.com/username/wp-sign.git`)

2. **Tạo Personal Access Token** (để đăng nhập):
   - Vào: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Chọn `repo` (full control)
   - Click "Generate token"
   - **Copy token** (chỉ hiện 1 lần!)

## Các Lệnh Chạy:

Mở **PowerShell** tại thư mục `E:\2.CODE\PROJECT WP SIGN`, copy từng lệnh:

```powershell
# 1. Init git
git init

# 2. Add .gitignore trước (BẮT BUỘC!)
git add .gitignore
git commit -m "Add gitignore"

# 3. Add tất cả files
git add .

# 4. Xem file nào sẽ được commit (kiểm tra)
git status

# 5. Commit
git commit -m "Initial commit: WP Sign platform"

# 6. Đổi branch thành main
git branch -M main

# 7. Add remote (THAY <URL> bằng URL repo của bạn)
git remote add origin <URL-REPO-CỦA-BẠN>

# Ví dụ:
# git remote add origin https://github.com/yourusername/wp-sign.git

# 8. Push lên GitHub
git push -u origin main
```

Khi push, nhập:
- **Username**: Tên GitHub của bạn
- **Password**: Dán **Personal Access Token** (không phải password thường!)

## ✅ Xong!

Vào GitHub repo của bạn sẽ thấy code đã lên!

## ⚠️ Lưu Ý:

**TRƯỚC KHI PUSH**, kiểm tra:
```powershell
# Xem file nào sẽ được push
git status

# KHÔNG được thấy:
# - backend/.env
# - frontend/.env.local  
# - node_modules/
```

Nếu thấy file `.env`, DỪNG LẠI và hỏi mình!

## 🆘 Nếu Gặp Lỗi:

### "Authentication failed"
→ Dùng Personal Access Token, không phải password

### "remote origin already exists"
```powershell
git remote remove origin
git remote add origin <URL-mới>
```

### "failed to push"
```powershell
git pull origin main --allow-unrelated-histories
git push -u origin main
```

---

**Cần giúp? Hỏi mình! 😊**
