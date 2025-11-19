# ✅ Checklist Trước Khi Push Lên GitHub

## 🔒 Security - QUAN TRỌNG NHẤT!

- [ ] **Kiểm tra `.gitignore` đã có:**
  - [ ] `.env`
  - [ ] `backend/.env`
  - [ ] `frontend/.env.local`
  - [ ] `license-server/.env`
  - [ ] `node_modules/`
  - [ ] `uploads/`

- [ ] **Xóa sensitive data trong code:**
  - [ ] Không có database passwords
  - [ ] Không có SMTP passwords
  - [ ] Không có API keys
  - [ ] Không có license keys
  - [ ] Không có JWT secrets

- [ ] **Kiểm tra file `.env.example` đã sanitized:**
  ```bash
  # Đúng ✅
  DATABASE_URL=postgresql://user:password@localhost:5432/dbname
  SMTP_PASS=your-smtp-password
  
  # SAI ❌ - Không để password thật
  DATABASE_URL=postgresql://admin:MyRealPass123@localhost:5432/esign
  SMTP_PASS=abc123xyz456
  ```

## 📁 File Structure

- [ ] **Tạo thư mục `e-office/`**
- [ ] **Move các folder vào:**
  - [ ] `backend/`
  - [ ] `frontend/`
  - [ ] `license-server/`
  - [ ] `docker-compose.yml`
  - [ ] Các file docs

## 📝 Documentation

- [ ] **README.md** - Rename `README-GITHUB.md` thành `README.md`
- [ ] **Update paths** trong docs nếu cần
- [ ] **Xóa hoặc move các file test/dev:**
  - [ ] `SUMMARY.md`, `TODAY-SUMMARY.md`, etc. → Move vào `docs/dev/`
  - [ ] Hoặc xóa nếu không cần

## 🧹 Cleanup

- [ ] **Xóa file không cần thiết:**
  ```bash
  # Các file này có thể xóa hoặc move vào docs/
  - START-SERVERS.md
  - RUN-BOTH.md
  - SETUP-COMPLETE.md
  - RUN-NOW.md
  - DONE.md
  ```

- [ ] **Xóa hoặc archive:**
  - [ ] `Main/__archive_original/` - Có thể xóa nếu không cần
  - [ ] `Main/reference_original_libresign/` - Có thể xóa nếu không cần

## 🔍 Final Check

```bash
# 1. Kiểm tra git status
git status

# 2. Tìm file .env (KHÔNG được có trong git)
git ls-files | grep "\.env$"
# Kết quả phải RỖNG!

# 3. Kiểm tra sensitive strings
git grep -i "password.*=" -- "*.ts" "*.js" "*.tsx"
git grep -i "secret.*=" -- "*.ts" "*.js" "*.tsx"
# Chỉ được thấy trong .env.example

# 4. Test build
cd backend && npm run build
cd frontend && npm run build
```

## 📤 Git Commands

```bash
# 1. Init git (nếu chưa có)
git init

# 2. Add .gitignore TRƯỚC
git add .gitignore
git commit -m "Add gitignore"

# 3. Add code
git add .
git commit -m "Initial commit: WP Sign e-signature platform"

# 4. Add remote
git remote add origin <your-github-repo-url>

# 5. Push
git push -u origin main
```

## ⚠️ DỪNG LẠI NẾU:

- ❌ File `.env` xuất hiện trong `git status`
- ❌ Thấy password thật trong code
- ❌ Thấy API keys trong code
- ❌ Folder `uploads/` có file thật
- ❌ `node_modules/` xuất hiện trong git

## 🎯 Recommended Structure

```
e-office/
├── .gitignore              ✅ MUST HAVE
├── README.md               ✅ Main docs
├── docker-compose.yml
├── backend/
│   ├── .env.example        ✅ Template only
│   ├── .env                ❌ NOT in git
│   └── ...
├── frontend/
│   ├── .env.example        ✅ Template only
│   ├── .env.local          ❌ NOT in git
│   └── ...
├── license-server/
│   ├── .env.example        ✅ Template only
│   ├── .env                ❌ NOT in git
│   └── ...
└── docs/
    ├── testing-guide.md
    ├── email-setup.md
    └── dev/                # Optional: dev notes
        ├── AGENTS.md
        └── ...
```

## ✅ Ready to Push When:

- [x] `.gitignore` configured
- [x] No `.env` files in git
- [x] No sensitive data in code
- [x] Documentation updated
- [x] Build passes
- [x] README.md ready

---

**🚨 NHẮC LẠI: Kiểm tra kỹ `.env` files KHÔNG được commit!**
