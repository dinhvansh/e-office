# Feature: Tenant Registration

## Overview

Tính năng cho phép người dùng đăng ký tài khoản mới với tùy chọn tạo workspace (tenant) riêng cho công ty của họ.

## User Flow

### Option 1: Đăng ký vào workspace mặc định
1. User truy cập `/register`
2. Điền thông tin: Họ tên, Email, Mật khẩu
3. Không chọn "Tạo workspace mới"
4. Submit form
5. User được tạo trong tenant mặc định (tenant_id = 1)
6. Trạng thái: `pending` - chờ admin phê duyệt

### Option 2: Đăng ký với workspace mới
1. User truy cập `/register`
2. Điền thông tin: Họ tên, Email, Mật khẩu
3. ✅ Chọn "Tạo workspace mới cho công ty của tôi"
4. Điền tên công ty
5. Submit form
6. Hệ thống tạo:
   - Tenant mới với tên công ty
   - User mới trong tenant đó
7. Trạng thái: `pending` - chờ admin phê duyệt

## Technical Implementation

### Backend Changes

#### 1. Registration Service (`backend/src/modules/auth/registration.service.ts`)

**Updated method signature:**
```typescript
async registerUser(data: {
  email: string;
  password: string;
  full_name: string;
  tenant_id?: number;
  company_name?: string;
  create_tenant?: boolean;
}): Promise<{ 
  success: boolean; 
  message: string; 
  userId?: number;
  tenantId?: number;
}>
```

**Logic:**
- If `create_tenant === true` and `company_name` provided:
  - Create new tenant with company name
  - Use email domain as tenant domain
  - Create user in new tenant
- Else:
  - Create user in default tenant (tenant_id = 1)

#### 2. Registration Controller (`backend/src/modules/auth/registration.controller.ts`)

**Updated validation schema:**
```typescript
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(1, 'Full name is required'),
  terms_accepted: z.boolean().refine(val => val === true, 'You must accept terms'),
  company_name: z.string().optional(),
  create_tenant: z.boolean().optional()
});
```

### Frontend Changes

#### 1. Register Page (`frontend/app/register/page.tsx`)

**New form fields:**
```typescript
const [formData, setFormData] = useState({
  email: '',
  password: '',
  confirmPassword: '',
  full_name: '',
  company_name: '',        // NEW
  create_tenant: false,    // NEW
  terms_accepted: false
});
```

**UI additions:**
- Checkbox: "Tạo workspace mới cho công ty của tôi"
- Conditional input: "Tên công ty" (shown when checkbox is checked)
- Validation: Company name required if create_tenant is true

**Success message:**
- Shows workspace name if tenant was created
- Different message for tenant vs non-tenant registration

## API Endpoint

### POST `/api/v1/auth/register`

**Request body:**
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

**Response (success):**
```json
{
  "success": true,
  "message": "Registration successful. Please wait for admin approval.",
  "userId": 123,
  "tenantId": 5
}
```

**Response (error):**
```json
{
  "error": "Email already registered."
}
```

## Database Schema

### Tenants Table
```sql
CREATE TABLE tenants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  tenant_id INTEGER REFERENCES tenants(id),
  status VARCHAR(50) DEFAULT 'pending',
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Testing

### Manual Testing

1. **Test tenant creation:**
   ```bash
   # Open browser
   http://localhost:3000/register
   
   # Fill form:
   - Full name: Test User
   - Email: test@newcompany.com
   - Password: TestPass123
   - ✅ Create new workspace
   - Company name: New Company Ltd
   - ✅ Accept terms
   
   # Submit and verify:
   - Success message shows
   - Check database for new tenant
   - Check user has correct tenant_id
   ```

2. **Test default tenant:**
   ```bash
   # Fill form without checking "Create new workspace"
   # Verify user created in tenant_id = 1
   ```

### Automated Testing

```bash
cd backend
node scripts/test-tenant-registration.js
```

**Test cases:**
- ✅ Register with new tenant
- ✅ Register in default tenant
- ✅ Validation: tenant flag without company name

## Security Considerations

1. **Email validation:** Must be valid email format
2. **Password strength:** Min 8 chars, uppercase, lowercase, number
3. **Tenant isolation:** Users can only see data in their tenant
4. **Admin approval:** All new users start with `pending` status
5. **Rate limiting:** Registration endpoint should be rate-limited

## Future Enhancements

- [ ] Email verification before approval
- [ ] Custom tenant domains
- [ ] Tenant settings during registration
- [ ] Invite-based registration
- [ ] SSO integration
- [ ] Tenant admin auto-assignment for tenant creator

## Related Files

**Backend:**
- `backend/src/modules/auth/registration.service.ts`
- `backend/src/modules/auth/registration.controller.ts`
- `backend/src/modules/auth/auth.routes.ts`

**Frontend:**
- `frontend/app/register/page.tsx`

**Scripts:**
- `backend/scripts/test-tenant-registration.js`

**Documentation:**
- `SECURITY.md` - Security guidelines
- `INSTALL.md` - Installation guide

## Notes

- Tenant domain is automatically set from email domain
- First user in new tenant should be promoted to admin after approval
- Email notifications sent to user and admins
- 24-hour cooldown for re-registration after rejection
