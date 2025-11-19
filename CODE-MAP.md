# 🗺️ Code Map - Hướng Dẫn Cho AI Assistant

**Last Updated**: 2025-11-18  
**Purpose**: Giúp AI assistant khác hiểu cấu trúc code và biết file nào làm gì

---

## 📁 Cấu Trúc Tổng Quan

```
PROJECT ROOT/
├── backend/              # Express API (TypeScript)
├── frontend/             # Next.js 14 App Router (TypeScript)
├── license-server/       # License validation service
├── docs/                 # Documentation
└── *.md                  # Project documentation files
```

---

## 🔧 Backend Structure

### Core Files

| File | Mục Đích |
|------|----------|
| `backend/src/server.ts` | Entry point, start server |
| `backend/src/app.ts` | Express app setup, middleware |
| `backend/src/router/v1.ts` | **QUAN TRỌNG**: Main router, register all modules |
| `backend/prisma/schema.prisma` | **QUAN TRỌNG**: Database schema |

### Module Pattern (Clean Architecture)

Mỗi module theo pattern:
```
backend/src/modules/{module-name}/
├── {module}.repository.ts   # Database queries (Prisma)
├── {module}.service.ts       # Business logic
├── {module}.controller.ts    # Request handlers
└── {module}.routes.ts        # Route definitions
```

### Existing Modules

#### 1. Auth Module (`backend/src/modules/auth/`)
- **Purpose**: Authentication & authorization
- **Key Files**:
  - `auth.middleware.ts` - `authGuard` middleware (check JWT)
  - `auth.service.ts` - Login, register, token generation
  - `auth.controller.ts` - Auth endpoints

#### 2. Users Module (`backend/src/modules/users/`)
- **Purpose**: User management
- **Key Features**: CRUD, change password, profile
- **Routes**: `/api/v1/users`

#### 3. Departments Module (`backend/src/modules/departments/`)
- **Purpose**: Department hierarchy management
- **Key Features**: Tree structure, manager assignment
- **Routes**: `/api/v1/departments`

#### 4. Roles Module (`backend/src/modules/roles/`)
- **Purpose**: Role & permission management
- **Key Features**: RBAC, permission assignment
- **Routes**: `/api/v1/roles`

#### 5. Document Types Module (`backend/src/modules/documentTypes/`)
- **Purpose**: Document classification
- **Key Features**: CRUD, category filtering
- **Routes**: `/api/v1/document-types`
- **Created**: 2025-11-18 (Phase 1)

#### 6. Numbering Module (`backend/src/modules/numbering/`)
- **Purpose**: Auto-generate document numbers
- **Key Features**: Pattern-based numbering, yearly reset
- **Routes**: `/api/v1/numbering-rules`
- **Created**: 2025-11-18 (Phase 1)

#### 7. Documents Module (`backend/src/modules/documents/`)
- **Purpose**: Document upload & management
- **Key Features**: File upload, versioning
- **Routes**: `/api/v1/documents`

#### 8. Sign Requests Module (`backend/src/modules/signRequests/`)
- **Purpose**: E-signature workflow
- **Key Features**: Create sign requests, track status
- **Routes**: `/api/v1/sign-requests`

#### 9. Signers Module (`backend/src/modules/signers/`)
- **Purpose**: Signer management & OTP
- **Key Features**: Send OTP, verify, sign
- **Routes**: `/api/v1/signers`

### Middleware

| File | Mục Đích |
|------|----------|
| `backend/src/modules/auth/auth.middleware.ts` | JWT authentication |
| `backend/src/middleware/permission.ts` | Permission checking |

**Usage**:
```typescript
// In routes file
import { authGuard } from '../auth/auth.middleware';
import { requirePermission } from '../../middleware/permission';

router.use(authGuard); // Require login
router.get('/', requirePermission('resource', 'action'), controller.method);
```

### Database

| File | Mục Đích |
|------|----------|
| `backend/prisma/schema.prisma` | **ĐỌC FILE NÀY TRƯỚC** - Database schema |
| `backend/scripts/seed.js` | Seed initial data |
| `backend/scripts/seed-rbac.js` | Seed roles & permissions |
| `backend/scripts/seed-document-types.js` | Seed document types |

**Important Tables**:
- `tenants` - Multi-tenant isolation
- `users` - User accounts
- `departments` - Organization structure
- `roles`, `permissions` - RBAC system
- `documents` - Document storage
- `document_types` - Document classification
- `numbering_rules` - Auto-numbering config

---

## 🎨 Frontend Structure

### Core Files

| File | Mục Đích |
|------|----------|
| `frontend/app/layout.tsx` | Root layout |
| `frontend/app/(dashboard)/layout.tsx` | **QUAN TRỌNG**: Dashboard layout + sidebar menu |
| `frontend/components/providers/auth-provider.tsx` | Auth context |

### Pages (App Router)

```
frontend/app/
├── (dashboard)/              # Protected routes
│   ├── page.tsx             # Dashboard home
│   ├── users/page.tsx       # User management
│   ├── departments/page.tsx # Department management
│   ├── roles/page.tsx       # Role management
│   ├── document-types/page.tsx  # Document types (NEW)
│   ├── documents/page.tsx   # Document list
│   ├── sign-requests/
│   │   ├── page.tsx         # Sign request list
│   │   └── [id]/page.tsx    # Sign request detail
│   └── ...
└── login/page.tsx           # Login page
```

### Adding New Page

1. Create file: `frontend/app/(dashboard)/new-page/page.tsx`
2. Add to sidebar: Edit `frontend/app/(dashboard)/layout.tsx`
3. Add to `navItems` array

### UI Patterns

**Data Fetching** (React Query):
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['resource'],
  queryFn: async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/resource`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
  },
});
```

**Mutations**:
```typescript
const mutation = useMutation({
  mutationFn: async (data) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/resource`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['resource'] });
  },
});
```

---

## 🔑 Key Concepts

### 1. Multi-Tenant Architecture

**Every request needs `tenant_id`**:
- Extracted from JWT token in `authGuard` middleware
- Available as `req.auth.tenantId` in controllers
- All database queries filtered by `tenant_id`

### 2. RBAC System

**Permission Format**: `resource:action`
- Resources: users, departments, documents, sign_requests, roles, audit_logs, settings
- Actions: create, read, update, delete, approve, share, etc.

**Check Permission**:
```typescript
// In routes
router.get('/', requirePermission('documents', 'read'), controller.get);

// In service (if needed)
const hasPermission = await rolesService.checkPermission(userId, 'documents', 'create');
```

### 3. Document Numbering

**Pattern Tokens**:
- `{AUTO}` - Auto increment (001, 002, ...)
- `{YEAR}` - Current year (2025)
- `{MONTH}` - Current month (01-12)
- `{DEPT}` - Department code
- `{TYPE}` - Document type code

**Example**: `{AUTO}/{DEPT}/{YEAR}` → `001/IT/2025`

**Generate Number**:
```typescript
const number = await numberingService.generateDocumentNumber(
  tenantId,
  documentTypeId,
  { departmentCode: 'IT' }
);
```

---

## 🚀 Adding New Module

### Backend Module

1. **Create folder**: `backend/src/modules/new-module/`

2. **Create files**:
```typescript
// new-module.repository.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const newModuleRepository = {
  async findAll(tenantId: number) {
    return prisma.table_name.findMany({
      where: { tenant_id: tenantId }
    });
  },
  // ... other methods
};

// new-module.service.ts
import { newModuleRepository } from './new-module.repository';

export const newModuleService = {
  async getAll(tenantId: number) {
    return newModuleRepository.findAll(tenantId);
  },
  // ... business logic
};

// new-module.controller.ts
import { Request, Response } from 'express';
import { newModuleService } from './new-module.service';

export const newModuleController = {
  async getAll(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const data = await newModuleService.getAll(tenantId);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};

// new-module.routes.ts
import { Router } from 'express';
import { newModuleController } from './new-module.controller';
import { authGuard } from '../auth/auth.middleware';

const router = Router();
router.use(authGuard);
router.get('/', newModuleController.getAll);
export default router;
```

3. **Register in router**: Edit `backend/src/router/v1.ts`
```typescript
import newModuleRouter from '../modules/new-module/new-module.routes';
v1Router.use('/new-module', newModuleRouter);
```

### Frontend Page

1. **Create page**: `frontend/app/(dashboard)/new-page/page.tsx`
2. **Add to sidebar**: Edit `frontend/app/(dashboard)/layout.tsx`

---

## 📝 Important Notes for AI

### When Reading Code:

1. **Start with**: `backend/prisma/schema.prisma` - Understand database
2. **Then read**: `backend/src/router/v1.ts` - See all available modules
3. **For each module**: Read in order: Repository → Service → Controller → Routes

### When Adding Features:

1. **Check schema first**: Does table exist? Need migration?
2. **Check permissions**: What permission needed?
3. **Follow pattern**: Repository → Service → Controller → Routes
4. **Update router**: Add to `v1.ts`
5. **Test**: Use `test-api.http` or create new tests

### Common Patterns:

**Get tenant ID**:
```typescript
const tenantId = (req as any).auth.tenantId;
```

**Get user ID**:
```typescript
const userId = (req as any).auth.userId;
```

**Error handling**:
```typescript
try {
  // logic
  res.json({ success: true, data });
} catch (error: any) {
  res.status(400).json({ success: false, error: error.message });
}
```

---

## 🔍 Quick Reference

### Find Module Code:
```
backend/src/modules/{module-name}/
```

### Find Frontend Page:
```
frontend/app/(dashboard)/{page-name}/page.tsx
```

### Add API Route:
1. Create module in `backend/src/modules/`
2. Register in `backend/src/router/v1.ts`

### Add UI Page:
1. Create in `frontend/app/(dashboard)/`
2. Add to sidebar in `layout.tsx`

### Database Changes:
1. Edit `backend/prisma/schema.prisma`
2. Run `npx prisma generate`
3. Run `npx prisma db push`

---

## 📚 Related Documentation

- **AGENTS.md** - Development progress log
- **PHASE-1-PLAN.md** - Current phase details
- **ERD.md** - Full database schema
- **FUNCTIONAL_SPEC.md** - Requirements
- **README.md** - Project overview

---

**For AI Assistants**: Đọc file này trước khi code để hiểu cấu trúc! 🤖
