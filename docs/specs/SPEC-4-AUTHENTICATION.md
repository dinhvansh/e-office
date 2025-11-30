# SPEC-4: Authentication & User Management

## 📋 Overview
Implement complete authentication flow including user registration, login, and password recovery.

**Priority**: HIGH  
**Estimated Time**: 3 days  
**Impact**: Enable self-service user management, reduce admin burden

---

## 🎯 Goals
- User self-registration with email verification
- Secure login with JWT tokens
- Password recovery via email
- Rate limiting for security
- Session management

---

## 📝 Current State

**Existing**:
- ✅ JWT authentication (`backend/src/modules/auth`)
- ✅ Login endpoint exists
- ✅ Email service configured

**Missing**:
- ❌ User registration endpoint
- ❌ Email verification
- ❌ Password reset flow
- ❌ Rate limiting on auth endpoints
- ❌ Frontend pages (register, forgot password)

---

## 📝 Task Breakdown

### Task 4.1: User Registration Backend (6 hours)

**File**: `backend/src/modules/auth/auth.controller.ts`

**New Endpoint**: `POST /api/v1/auth/register`

**Request Body**:
```typescript
{
  email: string;          // unique, validated
  password: string;       // min 8 chars, 1 uppercase, 1 number
  full_name: string;      // required
  phone?: string;         // optional
  tenant_domain: string;  // which organization to join
}
```

**Implementation**:
```typescript
async register(req: Request, res: Response) {
  const { email, password, full_name, phone, tenant_domain } = req.body;
  
  // 1. Validate input
  const validation = registerSchema.safeParse(req.body);
  if (!validation.success) {
    throw ApiError.badRequest('Invalid input', 'VALIDATION_ERROR');
  }
  
  // 2. Check if email already exists
  const existing = await prisma.users.findUnique({
    where: { email }
  });
  if (existing) {
    throw ApiError.badRequest('Email already registered', 'EMAIL_EXISTS');
  }
  
  // 3. Find tenant by domain
  const tenant = await prisma.tenants.findFirst({
    where: { domain: tenant_domain }
  });
  if (!tenant) {
    throw ApiError.notFound('Organization not found', 'TENANT_NOT_FOUND');
  }
  
  // 4. Check tenant user limit
  await licenseService.enforceUserLimit(tenant.id);
  
  // 5. Hash password
  const password_hash = await bcrypt.hash(password, 10);
  
  // 6. Create user (inactive until email verified)
  const user = await prisma.users.create({
    data: {
      email,
      password_hash,
      full_name,
      phone,
      tenant_id: tenant.id,
      status: 'pending_verification', // ← New status
      role: 'user'
    }
  });
  
  // 7. Generate verification token
  const verificationToken = jwt.sign(
    { userId: user.id, type: 'email_verification' },
    env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  // 8. Send verification email
  await emailService.sendVerificationEmail({
    to: email,
    name: full_name,
    verificationLink: `${env.FRONTEND_URL}/verify-email?token=${verificationToken}`
  });
  
  res.status(201).json({
    message: 'Registration successful. Please check your email to verify your account.',
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name
    }
  });
}
```

**Validation Schema** (Zod):
```typescript
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least 1 uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least 1 number'),
  full_name: z.string().min(2),
  phone: z.string().optional(),
  tenant_domain: z.string().min(1)
});
```

**Acceptance Criteria**:
- ✅ Email uniqueness validated
- ✅ Password complexity enforced
- ✅ Tenant user limit checked
- ✅ Verification email sent
- ✅ User status = 'pending_verification'
- ✅ Rate limiting: 3 registrations per IP per hour

---

### Task 4.2: Email Verification (4 hours)

**File**: `backend/src/modules/auth/auth.controller.ts`

**New Endpoint**: `POST /api/v1/auth/verify-email`

**Request Body**:
```typescript
{
  token: string; // JWT token from email
}
```

**Implementation**:
```typescript
async verifyEmail(req: Request, res: Response) {
  const { token } = req.body;
  
  try {
    // 1. Verify token
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      userId: number;
      type: string;
    };
    
    if (decoded.type !== 'email_verification') {
      throw ApiError.badRequest('Invalid token type', 'INVALID_TOKEN');
    }
    
    // 2. Update user status
    const user = await prisma.users.update({
      where: { id: decoded.userId },
      data: { status: 'active' }
    });
    
    // 3. Assign default role
    const defaultRole = await prisma.roles.findFirst({
      where: {
        tenant_id: user.tenant_id,
        name: 'User' // Default role
      }
    });
    
    if (defaultRole) {
      await prisma.user_roles.create({
        data: {
          user_id: user.id,
          role_id: defaultRole.id
        }
      });
    }
    
    // 4. Send welcome email
    await emailService.sendWelcomeEmail({
      to: user.email,
      name: user.full_name
    });
    
    res.json({
      message: 'Email verified successfully. You can now log in.',
      user: {
        id: user.id,
        email: user.email,
        status: user.status
      }
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.badRequest('Verification link expired', 'TOKEN_EXPIRED');
    }
    throw ApiError.badRequest('Invalid verification token', 'INVALID_TOKEN');
  }
}
```

**Email Template** (`backend/src/modules/emails/templates/verification.html`):
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    .container { max-width: 600px; margin: 0 auto; font-family: Arial; }
    .button { background: #4F46E5; color: white; padding: 12px 24px; 
              text-decoration: none; border-radius: 6px; display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Xác nhận địa chỉ email</h1>
    <p>Xin chào {{name}},</p>
    <p>Cảm ơn bạn đã đăng ký E-Office. Vui lòng nhấn nút bên dưới để xác nhận email:</p>
    <p><a href="{{verificationLink}}" class="button">Xác nhận Email</a></p>
    <p>Hoặc copy link sau vào trình duyệt:</p>
    <p>{{verificationLink}}</p>
    <p>Link này sẽ hết hạn sau 24 giờ.</p>
  </div>
</body>
</html>
```

**Acceptance Criteria**:
- ✅ Token validation works
- ✅ User status updated to 'active'
- ✅ Default role assigned
- ✅ Token expiration handled (24h)
- ✅ Welcome email sent

---

### Task 4.3: Forgot Password Flow (6 hours)

**File**: `backend/src/modules/auth/auth.controller.ts`

**Endpoint 1**: `POST /api/v1/auth/forgot-password`

**Request**:
```typescript
{
  email: string;
}
```

**Implementation**:
```typescript
async forgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  
  // 1. Find user (always return success for security)
  const user = await prisma.users.findUnique({
    where: { email }
  });
  
  if (!user) {
    // Don't reveal if email exists
    return res.json({
      message: 'If your email is registered, you will receive a password reset link.'
    });
  }
  
  // 2. Generate reset token
  const resetToken = jwt.sign(
    { userId: user.id, type: 'password_reset' },
    env.JWT_SECRET,
    { expiresIn: '1h' } // Short expiry for security
  );
  
  // 3. Store token hash in database (for invalidation)
  const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  await prisma.password_reset_tokens.create({
    data: {
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 3600000) // 1 hour
    }
  });
  
  // 4. Send reset email
  await emailService.sendPasswordResetEmail({
    to: email,
    name: user.full_name,
    resetLink: `${env.FRONTEND_URL}/reset-password?token=${resetToken}`
  });
  
  res.json({
    message: 'If your email is registered, you will receive a password reset link.'
  });
}
```

**Endpoint 2**: `POST /api/v1/auth/reset-password`

**Request**:
```typescript
{
  token: string;
  new_password: string;
}
```

**Implementation**:
```typescript
async resetPassword(req: Request, res: Response) {
  const { token, new_password } = req.body;
  
  try {
    // 1. Verify token
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      userId: number;
      type: string;
    };
    
    if (decoded.type !== 'password_reset') {
      throw ApiError.badRequest('Invalid token type', 'INVALID_TOKEN');
    }
    
    // 2. Check if token was used/revoked
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const storedToken = await prisma.password_reset_tokens.findFirst({
      where: {
        user_id: decoded.userId,
        token_hash: tokenHash,
        used: false,
        expires_at: { gt: new Date() }
      }
    });
    
    if (!storedToken) {
      throw ApiError.badRequest('Token invalid or expired', 'TOKEN_INVALID');
    }
    
    // 3. Validate new password
    const validation = z.string()
      .min(8)
      .regex(/[A-Z]/)
      .regex(/[0-9]/)
      .safeParse(new_password);
    
    if (!validation.success) {
      throw ApiError.badRequest('Password does not meet requirements', 'WEAK_PASSWORD');
    }
    
    // 4. Update password
    const password_hash = await bcrypt.hash(new_password, 10);
    await prisma.users.update({
      where: { id: decoded.userId },
      data: { password_hash }
    });
    
    // 5. Mark token as used
    await prisma.password_reset_tokens.update({
      where: { id: storedToken.id },
      data: { used: true }
    });
    
    // 6. Invalidate all existing sessions (optional but recommended)
    // This would require session management
    
    // 7. Send confirmation email
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId }
    });
    
    await emailService.sendPasswordChangedEmail({
      to: user.email,
      name: user.full_name
    });
    
    res.json({
      message: 'Password reset successfully. You can now log in with your new password.'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.badRequest('Reset link expired', 'TOKEN_EXPIRED');
    }
    throw error;
  }
}
```

**Database Migration**: Add `password_reset_tokens` table
```prisma
model password_reset_tokens {
  id         Int      @id @default(autoincrement())
  user_id    Int
  token_hash String   @unique
  used       Boolean  @default(false)
  expires_at DateTime
  created_at DateTime @default(now())
  
  user       users    @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  @@index([user_id])
  @@index([token_hash])
}
```

**Acceptance Criteria**:
- ✅ Forgot password doesn't reveal if email exists
- ✅ Reset token expires in 1 hour
- ✅ Token can only be used once
- ✅ Password validation enforced
- ✅ Confirmation email sent
- ✅ Rate limiting: 3 requests per email per hour

---

### Task 4.4: Frontend - Register Page (6 hours)

**File**: `frontend/app/(auth)/register/page.tsx`

**Design**:
```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    tenant_domain: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          phone: formData.phone,
          tenant_domain: formData.tenant_domain
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Đăng ký thất bại');
      }
      
      toast.success('Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.');
      router.push('/login?registered=true');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-3xl font-bold text-center">Đăng ký tài khoản</h2>
          <p className="mt-2 text-sm text-gray-600 text-center">
            Đã có tài khoản?{' '}
            <a href="/login" className="text-indigo-600 hover:underline">
              Đăng nhập
            </a>
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Họ và tên *
            </label>
            <Input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              placeholder="Nguyễn Văn A"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email *
            </label>
            <Input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="email@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Số điện thoại
            </label>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="0912345678"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tổ chức *
            </label>
            <Input
              type="text"
              required
              value={formData.tenant_domain}
              onChange={(e) => setFormData({...formData, tenant_domain: e.target.value})}
              placeholder="acme"
            />
            <p className="mt-1 text-xs text-gray-500">
              Nhập tên miền tổ chức của bạn
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Mật khẩu *
            </label>
            <Input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="••••••••"
            />
            <p className="mt-1 text-xs text-gray-500">
              Tối thiểu 8 ký tự, có chữ hoa và số
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Xác nhận mật khẩu *
            </label>
            <Input
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              placeholder="••••••••"
            />
          </div>
          
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : 'Đăng ký'}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

**Acceptance Criteria**:
- ✅ Form validation (client-side)
- ✅ Password strength indicator
- ✅ Loading states
- ✅ Error handling
- ✅ Success message with redirect
- ✅ Responsive design

---

### Task 4.5: Frontend - Forgot Password Page (4 hours)

**File**: `frontend/app/(auth)/forgot-password/page.tsx`

**Similar structure to register, with simpler form (email only)**

---

### Task 4.6: Frontend - Reset Password Page (4 hours)

**File**: `frontend/app/(auth)/reset-password/page.tsx`

**Gets token from URL query params**

---

### Task 4.7: Rate Limiting Middleware (3 hours)

**File**: `backend/src/middleware/rate-limit.ts`

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis';

export const authRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:auth:'
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

export const registerRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:register:'
  }),
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Too many registration attempts, please try again later.'
});
```

**Apply to routes**:
```typescript
router.post('/register', registerRateLimiter, authController.register);
router.post('/forgot-password', authRateLimiter, authController.forgotPassword);
router.post('/login', authRateLimiter, authController.login);
```

---

## 🧪 Testing Plan

### Backend Tests
```typescript
describe('Auth Registration', () => {
  it('should register new user successfully');
  it('should reject duplicate email');
  it('should validate password strength');
  it('should send verification email');
  it('should enforce rate limiting');
});

describe('Email Verification', () => {
  it('should verify valid token');
  it('should reject expired token');
  it('should activate user account');
});

describe('Password Reset', () => {
  it('should send reset email');
  it('should reset password with valid token');
  it('should reject used token');
  it('should enforce rate limiting');
});
```

### Frontend E2E Tests
```typescript
test('user can register and verify email', async ({ page }) => {
  await page.goto('/register');
  // Fill form and submit
  // Check for success message
});

test('user can reset password', async ({ page }) => {
  await page.goto('/forgot-password');
  // Submit email
  // Check email, click link
  // Set new password
});
```

---

## 📊 Success Metrics

- **Registration Rate**: Track signups per day
- **Email Verification**: >90% completion rate
- **Password Reset**: <5% failure rate
- **Security**: 0 brute force attempts successful

---

## 🚀 Deployment Checklist

- [ ] Email templates created
- [ ] SMTP configured
- [ ] Rate limiting enabled
- [ ] Database migration applied
- [ ] Frontend pages deployed
- [ ] Email deliverability tested
- [ ] Security audit completed
