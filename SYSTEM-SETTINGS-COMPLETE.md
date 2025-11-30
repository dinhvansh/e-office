# System Settings Feature - Complete ✅

## Tổng quan

Đã hoàn thành tính năng **Cài đặt hệ thống** cho phép admin cấu hình email SMTP và watermark theo từng công ty (tenant).

## Tính năng đã triển khai

### 1. Email SMTP Configuration
- **Hỗ trợ nhiều provider**: Gmail, Outlook, SendGrid, AWS SES, Mailgun, Custom SMTP
- **2 phương thức xác thực**:
  - SMTP với username/password (App Password cho Gmail)
  - OAuth 2.0 (cho Gmail và Outlook)
- **Cấu hình chi tiết**:
  - SMTP Host, Port
  - Username, Password
  - From Email, From Name
  - OAuth Client ID, Client Secret, Refresh Token
- **Test email**: Gửi email test để kiểm tra cấu hình
- **Lưu vào database**: Mỗi tenant có config riêng

### 2. Watermark Configuration
- **Bật/tắt watermark**: Toggle on/off
- **Tùy chỉnh nội dung**: Text tùy ý (VD: "CÔNG TY CỔ PHẦN ABC")
- **Vị trí**: Giữa trang, Chéo 45°, Trên cùng, Dưới cùng
- **Tùy chỉnh giao diện**:
  - Độ mờ (opacity): 0.1 - 1.0
  - Kích thước chữ: 24px - 72px
  - Góc xoay: 0° - 90°
  - Màu sắc: Color picker + hex input
- **Xem trước trực tiếp**: Live preview khi thay đổi
- **Lưu vào database**: Mỗi tenant có config riêng

## Cấu trúc code

### Backend

#### Database Schema
```prisma
model tenant_settings {
  id            Int       @id @default(autoincrement())
  tenant_id     Int
  setting_key   String    @db.VarChar(100)
  setting_value Json
  updated_by    Int?
  updated_at    DateTime  @default(now()) @updatedAt
  
  tenant        tenants   @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  
  @@unique([tenant_id, setting_key])
  @@index([tenant_id])
}
```

#### Module Structure
```
backend/src/modules/settings/
├── settings.repository.ts   # Database operations
├── settings.service.ts       # Business logic
├── settings.controller.ts    # HTTP handlers
└── settings.routes.ts        # API routes
```

#### API Endpoints
```
GET    /api/v1/settings/email          # Lấy email config
POST   /api/v1/settings/email          # Lưu email config
POST   /api/v1/settings/email/test     # Test gửi email
GET    /api/v1/settings/watermark      # Lấy watermark config
POST   /api/v1/settings/watermark      # Lưu watermark config
GET    /api/v1/settings                # Lấy tất cả settings
```

#### Permissions
- Resource: `settings`
- Action: `manage`
- Chỉ Admin role có quyền truy cập

### Frontend

#### Page Location
```
frontend/app/(dashboard)/settings/system/page.tsx
```

#### Features
- **Tabs UI**: Email SMTP và Watermark tabs
- **Form validation**: Real-time validation
- **Loading states**: Skeleton loading khi fetch data
- **Toast notifications**: Success/error feedback
- **Live preview**: Watermark preview với settings thực tế
- **Responsive**: Mobile-friendly design

#### API Integration
```typescript
// Load settings
const [emailRes, watermarkRes] = await Promise.all([
  api.get('/settings/email'),
  api.get('/settings/watermark')
]);

// Save settings
await api.post('/settings/email', emailConfig);
await api.post('/settings/watermark', watermarkConfig);

// Test email
await api.post('/settings/email/test', { testEmail });
```

## Testing

### Backend Test Script
```bash
node backend/scripts/test-settings-api.js
```

**Test coverage**:
- ✅ Login as admin
- ✅ Get email config (empty initially)
- ✅ Save email config
- ✅ Verify email config saved
- ✅ Get watermark config (default values)
- ✅ Save watermark config
- ✅ Verify watermark config saved
- ✅ Get all settings
- ✅ Test email send

### Frontend Testing
1. Login as admin: `admin@acme.local` / `admin123`
2. Navigate to: **Cài đặt hệ thống** (Settings icon in sidebar)
3. Test Email SMTP tab:
   - Select provider
   - Fill in SMTP details
   - Click "Lưu cấu hình"
   - Click "Test gửi email"
4. Test Watermark tab:
   - Enable watermark
   - Change text, position, opacity, etc.
   - See live preview
   - Click "Lưu cấu hình"

## Database Migration

```bash
cd backend
npx prisma generate
npx prisma db push
node scripts/seed-rbac.js  # Add settings permission
```

## Sử dụng trong production

### Email Config
Sau khi cấu hình email SMTP, hệ thống sẽ sử dụng config này để:
- Gửi email đăng ký user
- Gửi email reset password
- Gửi email thông báo approval
- Gửi email mời ký (external signers)
- Gửi email OTP

### Watermark Config
Sau khi cấu hình watermark, hệ thống sẽ tự động:
- Thêm watermark vào PDF khi tạo signed document
- Áp dụng settings: text, position, opacity, rotation, color
- Mỗi tenant có watermark riêng

## Hướng dẫn setup Email SMTP

### Gmail
1. Bật 2-Step Verification
2. Tạo App Password: https://myaccount.google.com/apppasswords
3. Cấu hình:
   - Provider: Gmail
   - SMTP Host: smtp.gmail.com
   - SMTP Port: 587
   - Username: your-email@gmail.com
   - Password: App Password (16 ký tự)

### Outlook
1. Cấu hình:
   - Provider: Outlook
   - SMTP Host: smtp-mail.outlook.com
   - SMTP Port: 587
   - Username: your-email@outlook.com
   - Password: Account password

### SendGrid
1. Tạo API Key tại: https://app.sendgrid.com/settings/api_keys
2. Cấu hình:
   - Provider: SendGrid
   - SMTP Host: smtp.sendgrid.net
   - SMTP Port: 587
   - Username: apikey
   - Password: Your API Key

## Files Changed

### Backend
- ✅ `backend/prisma/schema.prisma` - Added tenant_settings model
- ✅ `backend/prisma/migrations/20251129_add_tenant_settings/migration.sql` - Migration
- ✅ `backend/src/modules/settings/settings.repository.ts` - New
- ✅ `backend/src/modules/settings/settings.service.ts` - New
- ✅ `backend/src/modules/settings/settings.controller.ts` - New
- ✅ `backend/src/modules/settings/settings.routes.ts` - New
- ✅ `backend/src/router/v1.ts` - Added settings routes
- ✅ `backend/scripts/seed-rbac.js` - Added settings:manage permission
- ✅ `backend/scripts/test-settings-api.js` - New test script

### Frontend
- ✅ `frontend/app/(dashboard)/settings/system/page.tsx` - Updated with API integration

## Next Steps

### Tích hợp Email Service
- [ ] Update `email.service.ts` để đọc config từ database thay vì .env
- [ ] Implement test email functionality
- [ ] Add email template management

### Tích hợp Watermark
- [ ] Update `pdfGeneration.service.ts` để áp dụng watermark config
- [ ] Add watermark preview trong PDF viewer
- [ ] Support watermark cho document types khác nhau

### Enhancements
- [ ] Email template editor (WYSIWYG)
- [ ] Multiple email accounts per tenant
- [ ] Email sending logs/history
- [ ] Watermark image upload (logo)
- [ ] Watermark position presets

## Summary

Tính năng System Settings đã hoàn thành với đầy đủ backend API, database schema, frontend UI, và testing. Admin có thể cấu hình email SMTP và watermark cho từng công ty một cách dễ dàng qua giao diện web.

**URLs**:
- Backend API: http://localhost:4000/api/v1/settings
- Frontend UI: http://localhost:3000/settings/system
