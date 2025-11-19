# 🗺️ Code Map - Hướng Dẫn Cho AI Assistant

**Last Updated**: 2025-11-20  
**Purpose**: Giúp AI assistant khác hiểu cấu trúc code và biết file nào làm gì  
**Status**: Phase 1 CRUD - 100% Complete ✅

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
- **Key Features**: Full CRUD ✅, change password, profile
- **Routes**: `/api/v1/users`
- **Frontend**: `/users` - Create ✅, Edit ✅, Delete ✅
- **Updated**: 2025-11-20 - Added create & edit UI

#### 3. Departments Module (`backend/src/modules/departments/`)
- **Purpose**: Department hierarchy management
- **Key Features**: Full CRUD ✅, tree structure, manager assignment
- **Routes**: `/api/v1/departments`
- **Frontend**: `/departments` - Create ✅, Edit ✅, Delete ✅
- **Updated**: 2025-11-19 - Added code field & edit UI

#### 4. Roles Module (`backend/src/modules/roles/`)
- **Purpose**: Role & permission management
- **Key Features**: Full CRUD ✅, RBAC, permission assignment
- **Routes**: `/api/v1/roles`
- **Frontend**: `/roles` - Create ✅, Edit ✅, Delete ✅
- **Updated**: 2025-11-20 - Added edit UI

#### 5. Document Types Module (`backend/src/modules/documentTypes/`)
- **Purpose**: Document classification
- **Key Features**: Full CRUD ✅, category filtering
- **Routes**: `/api/v1/document-types`
- **Frontend**: `/document-types` - Full CRUD ✅
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
│   ├── users/page.tsx       # User management ✅ Full CRUD
│   ├── departments/page.tsx # Department management ✅ Full CRUD
│   ├── roles/page.tsx       # Role management ✅ Full CRUD
│   ├── document-types/page.tsx  # Document types ✅ Full CRUD
│   ├── external-orgs/page.tsx   # External orgs ✅ Full CRUD
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

**⚠️ IMPORTANT: Use fetchJson from useAuth hook** (handles token automatically):

```typescript
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';

const { fetchJson } = useAuth();

// Data Fetching (React Query)
const { data, isLoading } = useQuery({
  queryKey: ['resource'],
  queryFn: () => fetchJson<any>('/resource'),
  staleTime: 0,
  refetchOnMount: 'always',
});

// Note: fetchJson already unwraps .data, so use data directly, not data?.data
const items = (data as any) || [];
```

**Create/Edit Mutation Pattern** (RECOMMENDED):
```typescript
const [showModal, setShowModal] = useState(false);
const [editingItem, setEditingItem] = useState<Item | null>(null);
const [formData, setFormData] = useState(initialState);

const mutation = useMutation({
  mutationFn: (data) => {
    if (editingItem) {
      return fetchJson(`/resource/${editingItem.id}`, { 
        method: 'PUT', 
        body: JSON.stringify(data) 
      });
    }
    return fetchJson('/resource', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    });
  },
  onSuccess: () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData(initialState);
    toast.success(editingItem ? 'Cập nhật thành công!' : 'Tạo thành công!');
    setTimeout(() => queryClient.refetchQueries({ queryKey: ['resource'] }), 300);
  },
  onError: (error: any) => {
    const message = typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra';
    toast.error(`Lỗi: ${message}`);
  },
});

// Create button
<Button onClick={() => setShowModal(true)}>
  <Plus /> Tạo mới
</Button>

// Edit button
<Button onClick={() => {
  setEditingItem(item);
  setFormData({ ...item });
  setShowModal(true);
}}>
  <Edit />
</Button>

// Dynamic dialog
<Dialog open={showModal} onOpenChange={(open) => {
  setShowModal(open);
  if (!open) {
    setEditingItem(null);
    setFormData(initialState);
  }
}}>
  <DialogTitle>
    {editingItem ? 'Chỉnh sửa' : 'Tạo mới'}
  </DialogTitle>
  <form onSubmit={(e) => {
    e.preventDefault();
    mutation.mutate(formData);
  }}>
    {/* Form fields */}
    <Button type="submit">
      {editingItem ? 'Cập nhật' : 'Tạo'}
    </Button>
  </form>
</Dialog>
```

**Delete Mutation**:
```typescript
const deleteMutation = useMutation({
  mutationFn: (id: number) => fetchJson(`/resource/${id}`, { method: 'DELETE' }),
  onSuccess: () => {
    toast.success('Xóa thành công!');
    queryClient.invalidateQueries({ queryKey: ['resource'] });
  },
  onError: (error: any) => {
    toast.error(`Lỗi: ${error?.message || 'Có lỗi xảy ra'}`);
  },
});

// Delete button
<Button onClick={() => {
  if (confirm('Bạn có chắc muốn xóa?')) {
    deleteMutation.mutate(item.id);
  }
}}>
  <Trash2 />
</Button>
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

## ✅ Phase 1 CRUD Status (2025-11-20)

| Module | Create | Read | Update | Delete | Frontend Page | Status |
|--------|--------|------|--------|--------|---------------|--------|
| Departments | ✅ | ✅ | ✅ | ✅ | `/departments` | Complete |
| Roles | ✅ | ✅ | ✅ | ✅ | `/roles` | Complete |
| Users | ✅ | ✅ | ✅ | ✅ | `/users` | Complete |
| External Orgs | ✅ | ✅ | ✅ | ✅ | `/external-orgs` | Complete |
| Document Types | ✅ | ✅ | ✅ | ✅ | `/document-types` | Complete |

**All Phase 1 CRUD operations: 100% Complete! 🎉**

---

## 📚 Related Documentation

### For Development
- **AGENTS.md** - Development progress log (READ THIS FIRST!)
- **START-HERE-FOR-AI.md** - Onboarding guide for AI assistants
- **LESSONS-LEARNED.md** - Critical patterns & pitfalls
- **docs/dev/SESSION-2025-11-20-CRUD-COMPLETE.md** - Latest session report

### For Planning
- **PHASE-1-PLAN.md** - Phase 1 details (COMPLETE ✅)
- **PHASE-2-PLAN.md** - Next phase: Workflow Engine
- **ROADMAP-E-OFFICE.md** - 7-phase roadmap (14 weeks)

### For Reference
- **ERD.md** - Full database schema
- **FUNCTIONAL_SPEC.md** - Requirements
- **CODE-MAP.md** - This file (architecture guide)
- **README.md** - Project overview

### For Testing
- **TEST-CRUD-COMPLETE.md** - CRUD testing checklist
- **test-api.http** - REST Client test cases
- **docs/testing-guide.md** - Testing guide

---

## 🎯 Next Steps for Dev2

1. **Read these files first**:
   - `AGENTS.md` - See what's been done
   - `START-HERE-FOR-AI.md` - Onboarding guide
   - `LESSONS-LEARNED.md` - Avoid common pitfalls
   - `docs/dev/SESSION-2025-11-20-CRUD-COMPLETE.md` - Latest changes

2. **Test Phase 1 CRUD**:
   - Use checklist in `TEST-CRUD-COMPLETE.md`
   - Test all create/edit/delete operations
   - Verify toast notifications work

3. **Start Phase 2**:
   - Read `PHASE-2-PLAN.md`
   - Implement Workflow Engine
   - Follow the same patterns from Phase 1

---

**For AI Assistants**: Đọc file này trước khi code để hiểu cấu trúc! 🤖
