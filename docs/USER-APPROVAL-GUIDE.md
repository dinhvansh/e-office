# Hướng Dẫn Phê Duyệt User

## 📍 Vị Trí Phê Duyệt

Admin phê duyệt user tại trang:
```
http://localhost:3000/users
```

## 🔍 Cách Tìm User Chờ Duyệt

### Cách 1: Lọc theo trạng thái
1. Vào trang **Quản lý người dùng**
2. Click dropdown "Tất cả trạng thái"
3. Chọn **"Chờ duyệt"**
4. Danh sách sẽ hiển thị các user pending

### Cách 2: Xem tất cả
- User có trạng thái "Chờ duyệt" sẽ có badge màu vàng
- Có 2 nút: **Phê duyệt** (xanh) và **Từ chối** (đỏ)

## ✅ Phê Duyệt User

### Bước 1: Click nút "Phê duyệt"
- Nút màu xanh với icon CheckCircle
- Nằm bên phải dòng user

### Bước 2: Xác nhận
Dialog hiển thị:
- Tên/Email user
- Thông tin sau khi phê duyệt:
  - Tài khoản sẽ được kích hoạt
  - User có thể đăng nhập
  - Email thông báo gửi tự động
  - Vai trò "User" được gán mặc định

### Bước 3: Click "Phê duyệt"
- Hệ thống xử lý
- Toast thông báo thành công
- Email gửi đến user
- User có thể đăng nhập ngay

## ❌ Từ Chối User

### Bước 1: Click nút "Từ chối"
- Nút màu đỏ với icon XCircle
- Nằm bên phải dòng user

### Bước 2: Nhập lý do
Dialog yêu cầu:
- **Lý do từ chối** (bắt buộc)
- Lý do sẽ được gửi qua email cho user
- Thông tin sau khi từ chối:
  - Tài khoản đánh dấu "rejected"
  - User không thể đăng nhập
  - Email thông báo lý do gửi tự động
  - Có thể đăng ký lại sau 24 giờ

### Bước 3: Click "Từ chối"
- Hệ thống xử lý
- Toast thông báo thành công
- Email lý do từ chối gửi đến user

## 📧 Email Templates

### Email Đăng Ký Thành Công (User nhận)
- **Màu chủ đạo**: Xanh dương (#0ea5e9)
- **Logo**: Bên trái header
- **Nội dung**: Thông báo chờ phê duyệt
- **Thời gian**: Thường trong 24 giờ

### Email Phê Duyệt (User nhận)
- **Màu chủ đạo**: Xanh dương (#0ea5e9)
- **Logo**: Bên trái header
- **Nội dung**: Tài khoản đã kích hoạt
- **Button**: "Đăng nhập ngay" (link đến /login)

### Email Từ Chối (User nhận)
- **Màu chủ đạo**: Xanh dương (#0ea5e9)
- **Logo**: Bên trái header
- **Nội dung**: Lý do từ chối
- **Thông tin**: Có thể đăng ký lại sau 24 giờ

### Email Thông Báo Admin
- **Màu chủ đạo**: Xanh dương (#0ea5e9)
- **Logo**: Bên trái header
- **Nội dung**: Có đăng ký mới cần duyệt
- **Button**: "Xem danh sách chờ duyệt" (link đến /users)

## 🎨 Thiết Kế Email

### Header
```
┌─────────────────────────────────────┐
│ [Logo E] Đăng ký thành công!        │
│          E-Office - Quản lý tài liệu│
└─────────────────────────────────────┘
```

### Màu sắc
- **Primary**: #0ea5e9 (Sky Blue)
- **Secondary**: #06b6d4 (Cyan)
- **Success**: #10b981 (Green)
- **Warning**: #f59e0b (Amber)
- **Background**: #f9fafb (Gray)

### Logo
- Chữ "E" màu xanh (#0ea5e9)
- Nền trắng, bo góc 12px
- Kích thước: 60x60px
- Vị trí: Bên trái header

## 🔐 Quyền Hạn

Admin cần có quyền:
- `users:read` - Xem danh sách user
- `users:update` - Phê duyệt/Từ chối user

## 📊 Trạng Thái User

| Trạng thái | Màu Badge | Ý nghĩa |
|-----------|-----------|---------|
| `pending` | Vàng | Chờ phê duyệt |
| `active` | Xanh | Đã kích hoạt |
| `inactive` | Xám | Không hoạt động |
| `rejected` | Đỏ | Đã từ chối |

## 🔄 Quy Trình Đăng Ký

```
User đăng ký
    ↓
Email xác nhận → User
    ↓
Email thông báo → Admin
    ↓
Admin xem xét
    ↓
┌─────────┴─────────┐
│                   │
Phê duyệt      Từ chối
│                   │
↓                   ↓
Email kích hoạt  Email lý do
→ User           → User
│                   │
↓                   ↓
Đăng nhập OK    Chờ 24h
```

## 💡 Tips

1. **Kiểm tra email domain**: Đảm bảo email hợp lệ trước khi phê duyệt
2. **Lý do từ chối rõ ràng**: Giúp user hiểu và sửa lỗi
3. **Phản hồi nhanh**: Xử lý trong 24 giờ để user không chờ lâu
4. **Kiểm tra duplicate**: Xem có user trùng email không

## 🐛 Troubleshooting

### Email không gửi được
- Kiểm tra cấu hình SMTP trong backend/.env
- Xem logs backend để debug
- Test với: `node backend/scripts/test-real-email.js`

### User không thấy trong danh sách
- Kiểm tra filter "Chờ duyệt" đã chọn chưa
- Refresh trang (F5)
- Kiểm tra database: `status = 'pending'`

### Không có nút Phê duyệt/Từ chối
- Kiểm tra quyền admin
- User phải có status = 'pending'
- Đăng nhập lại nếu cần

## 📝 API Endpoints

```
GET  /api/v1/users/pending          # Lấy danh sách chờ duyệt
POST /api/v1/users/:id/approve      # Phê duyệt user
POST /api/v1/users/:id/reject       # Từ chối user (body: {reason})
```

## 🔗 Liên Quan

- [TENANT-REGISTRATION-GUIDE.md](./TENANT-REGISTRATION-GUIDE.md) - Hướng dẫn đăng ký
- [FEATURE-TENANT-REGISTRATION.md](./dev/FEATURE-TENANT-REGISTRATION.md) - Technical docs
- [SECURITY.md](../SECURITY.md) - Bảo mật
