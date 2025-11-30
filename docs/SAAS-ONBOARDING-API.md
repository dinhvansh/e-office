# SaaS Onboarding API - Tenant Registration

## 📋 Overview

API để tạo tenant mới kèm admin user cho SaaS model. API này tự động setup:
- ✅ Tenant mới
- ✅ Admin user với full permissions
- ✅ Default roles (Admin, Manager, User)
- ✅ Default department
- ✅ 8 document types với auto-numbering
- ✅ All permissions cho Admin role

---

## 🔌 API Endpoint

### **POST** `/api/v1/tenants/create-with-admin`

**Public endpoint** - Không cần authentication

---

## 📥 Request Body

```json
{
  "tenant_name": "Acme Corporation",
  "tenant_domain": "acme.com",
  "admin_email": "admin@acme.com",
  "admin_password": "Admin@123",
  "admin_full_name": "John Doe"
}
```

### Required Fields:
- `tenant_name` (string) - Tên công ty/tổ chức
- `admin_email` (string) - Email admin (phải unique)
- `admin_password` (string) - Password (min 8 chars, phải có uppercase, lowercase, number)
- `admin_full_name` (string) - Họ tên admin

### Optional Fields:
- `tenant_domain` (string) - Domain của công ty (optional)

---

## 📤 Response

### Success (201 Created):

```json
{
  "success": true,
  "data": {
    "tenant": {
      "id": 2,
      "name": "Acme Corporation",
      "domain": "acme.com",
      "status": "active"
    },
    "admin": {
      "id": 10,
      "email": "admin@acme.com",
      "full_name": "John Doe"
    },
    "message": "Tenant and admin created successfully"
  }
}
```

### Error Responses:

**400 Bad Request** - Missing fields:
```json
{
  "error": "Missing required fields",
  "required": ["tenant_name", "admin_email", "admin_password", "admin_full_name"]
}
```

**400 Bad Request** - Email exists:
```json
{
  "success": false,
  "error": {
    "message": "Email already registered",
    "code": "EMAIL_EXISTS"
  }
}
```

**400 Bad Request** - Weak password:
```json
{
  "success": false,
  "error": {
    "message": "Password must contain uppercase, lowercase, and number",
    "code": "WEAK_PASSWORD"
  }
}
```

---

## 🧪 Testing

### Using cURL:

```bash
curl -X POST http://localhost:4000/api/v1/tenants/create-with-admin \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_name": "Acme Corporation",
    "tenant_domain": "acme.com",
    "admin_email": "admin@acme.com",
    "admin_password": "Admin@123",
    "admin_full_name": "John Doe"
  }'
```

### Using Node.js script:

```bash
cd backend
node scripts/test-create-tenant.js
```

### Using Postman:

1. Method: `POST`
2. URL: `http://localhost:4000/api/v1/tenants/create-with-admin`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
```json
{
  "tenant_name": "Acme Corporation",
  "tenant_domain": "acme.com",
  "admin_email": "admin@acme.com",
  "admin_password": "Admin@123",
  "admin_full_name": "John Doe"
}
```

---

## 🎯 What Gets Created

### 1. Tenant
- Status: `active`
- Plan: `null` (can be set later)

### 2. Admin User
- Status: `active` (no approval needed)
- Role: `admin`
- Assigned to default department

### 3. Roles (3 default roles)
- **Admin** - Full system access (27 permissions)
- **Manager** - Department manager
- **User** - Regular user

### 4. Department
- Name: `General`
- Code: `GEN`

### 5. Document Types (8 types)
- CV - Công văn
- QD - Quyết định
- TB - Thông báo
- BC - Báo cáo
- HD - Hợp đồng
- TT - Thông tư
- GN - Giấy nghỉ
- KH - Kế hoạch

### 6. Permissions (27 permissions for Admin)
```
documents.*, users.*, roles.*, departments.*,
workflows.*, approvals.*, sign_requests.*,
document_types.*, settings.*, webhooks.*,
external_orgs.*
```

---

## 🔐 Login After Registration

After successful registration, admin can login immediately:

**POST** `/api/v1/auth/login`

```json
{
  "email": "admin@acme.com",
  "password": "Admin@123"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 10,
      "email": "admin@acme.com",
      "full_name": "John Doe",
      "role": "admin",
      "tenant_id": 2
    }
  }
}
```

---

## 🚀 Integration Example

### Frontend Registration Form:

```typescript
async function registerTenant(formData: {
  tenant_name: string;
  tenant_domain?: string;
  admin_email: string;
  admin_password: string;
  admin_full_name: string;
}) {
  try {
    const response = await fetch('http://localhost:4000/api/v1/tenants/create-with-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Registration failed');
    }

    const result = await response.json();
    
    // Auto-login after registration
    const loginResponse = await fetch('http://localhost:4000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: formData.admin_email,
        password: formData.admin_password
      })
    });

    const loginData = await loginResponse.json();
    
    // Store token and redirect to dashboard
    localStorage.setItem('token', loginData.data.token);
    window.location.href = '/dashboard';

  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}
```

---

## 📝 Notes

1. **Email Uniqueness**: Email phải unique across tất cả tenants
2. **Password Policy**: Min 8 chars, phải có uppercase, lowercase, và number
3. **Atomic Transaction**: Tất cả operations trong 1 transaction, nếu fail thì rollback hết
4. **No Email Verification**: Admin được active ngay, không cần verify email
5. **Default Setup**: Tự động tạo roles, permissions, department, document types

---

## 🔄 Migration Path

### From Single-Tenant to Multi-Tenant:

1. **Keep existing tenant_id = 1** as default
2. **New tenants** use this API to register
3. **Existing users** continue using tenant_id = 1
4. **No code changes** needed for existing functionality

### Feature Flag Approach:

```typescript
// .env
MULTI_TENANT_MODE=true  // Enable multi-tenant
ALLOW_TENANT_REGISTRATION=true  // Allow new tenant registration
```

---

## 🎉 Ready for SaaS!

Với API này, bạn có thể:
- ✅ Cho phép khách hàng tự đăng ký tenant mới
- ✅ Tự động setup toàn bộ hệ thống cho tenant
- ✅ Admin login ngay sau khi đăng ký
- ✅ Không cần manual setup database

**Perfect for SaaS onboarding flow!** 🚀
