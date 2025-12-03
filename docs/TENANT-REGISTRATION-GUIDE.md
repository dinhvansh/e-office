# Hướng Dẫn Đăng Ký Tenant

## Tổng Quan

E-Office hỗ trợ 2 loại đăng ký:
1. **Đăng ký thường** - Tham gia workspace có sẵn
2. **Đăng ký với Tenant mới** - Tạo workspace riêng cho công ty

## Đăng Ký Thường (Join Existing Workspace)

### Bước 1: Truy cập trang đăng ký
```
http://localhost:3000/register
```

### Bước 2: Điền thông tin
- **Họ và tên**: Tên đầy đủ của bạn
- **Email**: Email công ty hoặc cá nhân
- **Mật khẩu**: Tối thiểu 8 ký tự, bao gồm:
  - Ít nhất 1 chữ hoa
  - Ít nhất 1 chữ thường
  - Ít nhất 1 số
- **Xác nhận mật khẩu**: Nhập lại mật khẩu

### Bước 3: Đồng ý điều khoản
✅ Tích vào "Tôi đồng ý với điều khoản sử dụng"

### Bước 4: Đăng ký
Click nút **"Đăng ký"**

### Bước 5: Chờ phê duyệt
- Bạn sẽ nhận email xác nhận
- Admin sẽ xem xét và phê duyệt trong vòng 24 giờ
- Bạn sẽ nhận email thông báo khi tài khoản được kích hoạt

---

## Đăng Ký Với Tenant Mới (Create New Workspace)

### Khi nào nên tạo Tenant mới?

✅ **Nên tạo tenant mới khi:**
- Bạn đại diện cho một công ty/tổ chức
- Muốn quản lý dữ liệu riêng biệt
- Cần workspace độc lập cho team

❌ **Không nên tạo tenant mới khi:**
- Bạn là nhân viên tham gia công ty có sẵn
- Chỉ muốn dùng thử hệ thống
- Không chắc chắn về nhu cầu

### Bước 1: Truy cập trang đăng ký
```
http://localhost:3000/register
```

### Bước 2: Điền thông tin cơ bản
- **Họ và tên**: Tên đầy đủ của bạn
- **Email**: Email công ty (khuyến nghị dùng email domain công ty)

### Bước 3: Chọn tạo workspace mới
✅ Tích vào **"Tạo workspace mới cho công ty của tôi"**

### Bước 4: Điền tên công ty
- **Tên công ty**: Tên chính thức của công ty/tổ chức
  - Ví dụ: "Công ty TNHH ABC"
  - Ví dụ: "ACME Corporation"

### Bước 5: Điền mật khẩu
- **Mật khẩu**: Tối thiểu 8 ký tự (chữ hoa, chữ thường, số)
- **Xác nhận mật khẩu**: Nhập lại mật khẩu

### Bước 6: Đồng ý điều khoản
✅ Tích vào "Tôi đồng ý với điều khoản sử dụng"

### Bước 7: Đăng ký
Click nút **"Đăng ký"**

### Bước 8: Xác nhận thành công
Bạn sẽ thấy thông báo:
```
✅ Đăng ký thành công!
Workspace mới và tài khoản của bạn đã được tạo, 
đang chờ phê duyệt từ quản trị viên.

📧 Email: your.email@company.com
🏢 Workspace: Công ty TNHH ABC

Bạn sẽ nhận được email thông báo khi tài khoản được kích hoạt.
```

---

## Sau Khi Đăng Ký

### Email xác nhận
Bạn sẽ nhận email với nội dung:
- Xác nhận đăng ký thành công
- Trạng thái: Chờ phê duyệt
- Thời gian xử lý: Thường trong vòng 24 giờ

### Admin phê duyệt
- Admin hệ thống sẽ xem xét đăng ký
- Có thể phê duyệt hoặc từ chối
- Bạn sẽ nhận email thông báo kết quả

### Khi được phê duyệt
Bạn sẽ nhận email:
```
🎉 Tài khoản đã được kích hoạt!

Bạn có thể đăng nhập và bắt đầu sử dụng hệ thống ngay bây giờ.

[Đăng nhập ngay]
```

### Đăng nhập lần đầu
1. Truy cập: `http://localhost:3000/login`
2. Nhập email và mật khẩu đã đăng ký
3. Click "Đăng nhập"
4. Bạn sẽ được chuyển đến dashboard

---

## Câu Hỏi Thường Gặp

### Q: Tôi có thể đổi từ tenant mặc định sang tenant riêng không?
A: Không. Bạn cần đăng ký tài khoản mới với tenant riêng.

### Q: Tôi có thể tham gia nhiều tenant không?
A: Hiện tại mỗi tài khoản chỉ thuộc về 1 tenant.

### Q: Ai sẽ là admin của tenant mới?
A: Người đăng ký tenant sẽ được cấp quyền admin sau khi được phê duyệt.

### Q: Tôi quên mật khẩu thì làm sao?
A: Click "Quên mật khẩu?" trên trang login để reset.

### Q: Đăng ký bị từ chối, tôi có thể đăng ký lại không?
A: Có, sau 24 giờ bạn có thể đăng ký lại với cùng email.

### Q: Tôi nhập sai tên công ty, có thể sửa không?
A: Liên hệ admin để đổi tên tenant sau khi được phê duyệt.

### Q: Email xác nhận không đến, phải làm sao?
A: Kiểm tra thư mục Spam. Nếu vẫn không có, liên hệ admin.

---

## Lưu Ý Bảo Mật

⚠️ **Quan trọng:**
- Không chia sẻ mật khẩu với người khác
- Sử dụng mật khẩu mạnh và duy nhất
- Đổi mật khẩu định kỳ
- Không sử dụng email cá nhân cho tài khoản công ty

---

## Liên Hệ Hỗ Trợ

Nếu gặp vấn đề trong quá trình đăng ký:
- Email: support@e-office.com
- Hotline: 1900-xxxx
- Hoặc liên hệ admin hệ thống

---

## Technical Details (For Developers)

### API Endpoint
```
POST /api/v1/auth/register
```

### Request Body
```json
{
  "email": "user@company.com",
  "password": "SecurePass123",
  "full_name": "John Doe",
  "company_name": "ACME Corporation",
  "create_tenant": true,
  "terms_accepted": true
}
```

### Response
```json
{
  "success": true,
  "message": "Registration successful. Please wait for admin approval.",
  "userId": 123,
  "tenantId": 5
}
```

### Database Changes
- New record in `tenants` table (if create_tenant = true)
- New record in `users` table with status = 'pending'
- User linked to tenant via `tenant_id`

### See Also
- [FEATURE-TENANT-REGISTRATION.md](./dev/FEATURE-TENANT-REGISTRATION.md) - Technical documentation
- [SECURITY.md](../SECURITY.md) - Security guidelines
- [INSTALL.md](../INSTALL.md) - Installation guide
