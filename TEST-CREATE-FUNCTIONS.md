# Test Create Functions - Debug Guide

## Mục đích
Kiểm tra xem các chức năng tạo mới có hoạt động không:
- Tạo vai trò (Roles)
- Tạo phòng ban (Departments)
- Tạo tổ chức ngoài (External Orgs)
- Tạo người dùng (Users)

## Đã thêm Debug Logs

Tất cả các mutation giờ có:
- ✅ Console logs để track request/response
- ✅ Error handling với alert
- ✅ Success message với alert

## Cách Test

### 1. Mở Browser Console (F12)
- Chrome/Edge: F12 → Console tab
- Firefox: F12 → Console tab

### 2. Test Tạo Vai Trò
1. Vào http://localhost:3000/roles
2. Click "Tạo vai trò mới"
3. Nhập:
   - Tên: "Test Role"
   - Mô tả: "Test description"
4. Click "Tạo"
5. **Check Console** xem có logs:
   ```
   Creating role: {name: "Test Role", description: "Test description"}
   Response status: 201
   Role created: {...}
   Role created successfully
   ```
6. Nếu có lỗi, sẽ hiện alert với message lỗi

### 3. Test Tạo Phòng Ban
1. Vào http://localhost:3000/departments
2. Click "Thêm phòng ban"
3. Nhập:
   - Tên: "Test Department"
   - Mô tả: "Test description"
4. Click "Tạo"
5. **Check Console** xem có logs tương tự

### 4. Test Tạo Tổ Chức Ngoài
1. Vào http://localhost:3000/external-orgs
2. Click "Thêm tổ chức"
3. Nhập thông tin
4. Click "Tạo"
5. **Check Console**

### 5. Test Tạo Người Dùng
1. Vào http://localhost:3000/users
2. Click "Thêm người dùng"
3. Nhập thông tin
4. Click "Tạo"
5. **Check Console**

## Các Lỗi Thường Gặp

### 1. Network Error
```
Failed to fetch
```
**Nguyên nhân**: Backend không chạy hoặc CORS issue
**Fix**: Check backend đang chạy tại http://localhost:4000

### 2. 401 Unauthorized
```
Response status: 401
```
**Nguyên nhân**: Token hết hạn hoặc không hợp lệ
**Fix**: Logout và login lại

### 3. 400 Bad Request
```
Response status: 400
Error: Validation failed
```
**Nguyên nhân**: Dữ liệu không hợp lệ (thiếu field bắt buộc)
**Fix**: Check console log để xem data gửi đi

### 4. 500 Internal Server Error
```
Response status: 500
```
**Nguyên nhân**: Lỗi backend (database, logic)
**Fix**: Check backend console logs

## Backend Logs

Để xem backend logs:
```bash
# Check process output
# Hoặc xem terminal đang chạy backend
```

Backend sẽ log:
- Incoming requests
- Database queries
- Errors

## API Endpoints

- POST /api/v1/roles
- POST /api/v1/departments
- POST /api/v1/external-orgs
- POST /api/v1/users

## Next Steps

Sau khi test, báo cáo:
1. ✅ Trang nào hoạt động
2. ❌ Trang nào bị lỗi
3. 📋 Error message trong console
4. 📋 Backend logs (nếu có)

Mình sẽ fix dựa trên thông tin đó!
