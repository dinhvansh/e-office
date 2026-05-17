# 🤝 Handoff Document for Dev2

**Date**: 2025-11-20  
**From**: AI Assistant (Kiro)  
**To**: Dev2  
**Status**: Phase 1 CRUD - 100% Complete ✅

---

## 📋 Quick Summary

Tất cả CRUD operations cho Phase 1 đã hoàn thành! Bạn có thể:
1. Test toàn bộ chức năng CRUD
2. Bắt đầu Phase 2: Workflow Engine
3. Hoặc polish thêm UI/UX

---

## ✅ What's Been Completed

### Session 2025-11-20 (30 minutes)
Completed 3 missing CRUD operations:

1. **Roles - Edit Function** ✅
   - File: `frontend/app/(dashboard)/roles/page.tsx`
   - Features: Edit modal, pre-fill form, dynamic title/button
   - Pattern: Unified create/edit mutation

2. **Users - Create Function** ✅
   - File: `frontend/app/(dashboard)/users/page.tsx`
   - Features: Full form with email, password, name, phone, department, roles
   - UI: Department dropdown + role checkboxes

3. **Users - Edit Function** ✅
   - File: `frontend/app/(dashboard)/users/page.tsx`
   - Features: Edit modal, email disabled, password optional
   - Pattern: Same as roles edit

### All Phase 1 CRUD Modules

| Module | Frontend Page | Create | Edit | Delete | Status |
|--------|---------------|--------|------|--------|--------|
| Departments | `/departments` | ✅ | ✅ | ✅ | Complete |
| Roles | `/roles` | ✅ | ✅ | ✅ | Complete |
| Users | `/users` | ✅ | ✅ | ✅ | Complete |
| External Orgs | `/external-orgs` | ✅ | ✅ | ✅ | Complete |
| Document Types | `/document-types` | ✅ | ✅ | ✅ | Complete |

---

## 🚀 How to Start

### 1. Read These Files First (15 minutes)

**Must Read** (in order):
1. `AGENTS.md` - Full development history
2. `START-HERE-FOR-AI.md` - Onboarding guide
3. `LESSONS-LEARNED.md` - Critical patterns & pitfalls
4. `docs/dev/SESSION-2025-11-20-CRUD-COMPLETE.md` - Latest session
5. `CODE-MAP.md` - Architecture guide

**Optional** (if needed):
- `PHASE-2-PLAN.md` - Next phase details
- `ERD.md` - Database schema
- `FUNCTIONAL_SPEC.md` - Requirements

### 2. Test Everything (30 minutes)

Use checklist in `TEST-CRUD-COMPLETE.md`:

**Roles** (`http://localhost:3000/roles`):
- [ ] Create new role
- [ ] Edit existing role
- [ ] Delete role
- [ ] Verify toast notifications

**Users** (`http://localhost:3000/users`):
- [ ] Create user with all fields
- [ ] Create user with minimal fields
- [ ] Edit user (change name, department, roles)
- [ ] Edit user without changing password
- [ ] Delete user
- [ ] Verify toast notifications

**Departments** (`http://localhost:3000/departments`):
- [ ] Create department
- [ ] Edit department
- [ ] Delete department

**External Orgs** (`http://localhost:3000/external-orgs`):
- [ ] Full CRUD operations

**Document Types** (`http://localhost:3000/document-types`):
- [ ] Full CRUD operations

### 3. Start Phase 2 (or Polish)

**Option A: Start Phase 2 - Workflow Engine**
- Read `PHASE-2-PLAN.md`
- Duration: 2 weeks (20 hours)
- Features: Workflow templates, multi-step approval, deadline tracking

**Option B: Polish Phase 1**
- Add loading skeletons
- Add empty states
- Add pagination
- Add bulk operations
- Improve mobile responsiveness

---

## 🎨 UI/UX Patterns (IMPORTANT!)

### 1. Data Fetching Pattern

**✅ CORRECT** (use fetchJson from useAuth):
```typescript
import { useAuth } from '@/components/providers/auth-provider';

const { fetchJson } = useAuth();

const { data, isLoading } = useQuery({
  queryKey: ['items'],
  queryFn: () => fetchJson<any>('/items'),
  staleTime: 0,
  refetchOnMount: 'always',
});

// fetchJson already unwraps .data
const items = (data as any) || [];
```

**❌ WRONG** (manual token handling):
```typescript
// Don't do this!
const token = localStorage.getItem('token');
fetch(url, { headers: { Authorization: `Bearer ${token}` } });
```

### 2. Create/Edit Pattern (RECOMMENDED)

```typescript
// 1. State
const [showModal, setShowModal] = useState(false);
const [editingItem, setEditingItem] = useState<Item | null>(null);
const [formData, setFormData] = useState(initialState);

// 2. Mutation
const mutation = useMutation({
  mutationFn: (data) => {
    if (editingItem) {
      return fetchJson(`/items/${editingItem.id}`, { 
        method: 'PUT', 
        body: JSON.stringify(data) 
      });
    }
    return fetchJson('/items', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    });
  },
  onSuccess: () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData(initialState);
    toast.success(editingItem ? 'Cập nhật thành công!' : 'Tạo thành công!');
    setTimeout(() => queryClient.refetchQueries({ queryKey: ['items'] }), 300);
  },
  onError: (error: any) => {
    const message = typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra';
    toast.error(`Lỗi: ${message}`);
  },
});

// 3. Create button
<Button onClick={() => setShowModal(true)}>
  <Plus /> Tạo mới
</Button>

// 4. Edit button
<Button onClick={() => {
  setEditingItem(item);
  setFormData({ ...item });
  setShowModal(true);
}}>
  <Edit />
</Button>

// 5. Dynamic dialog
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
  {/* Form */}
</Dialog>
```

### 3. Toast Notifications

**✅ Use toast** (not alert):
```typescript
import { toast } from 'sonner';

toast.success('Thành công!');
toast.error('Có lỗi xảy ra!');
```

**❌ Don't use alert**:
```typescript
alert('Success'); // Don't do this!
```

---

## 🔧 Tech Stack

### Backend
- **Framework**: Express.js + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT tokens
- **Architecture**: Clean Architecture (Repository → Service → Controller → Routes)

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **State**: React Query (TanStack Query)
- **Forms**: React Hook Form (optional, currently using controlled inputs)
- **Notifications**: Sonner (toast)

---

## 📁 Project Structure

```
PROJECT ROOT/
├── backend/
│   ├── src/
│   │   ├── modules/          # Feature modules
│   │   │   ├── users/
│   │   │   ├── departments/
│   │   │   ├── roles/
│   │   │   ├── documentTypes/
│   │   │   └── ...
│   │   ├── middleware/       # Auth, permissions
│   │   ├── router/           # v1.ts (main router)
│   │   └── server.ts         # Entry point
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── migrations/
│   └── scripts/              # Seed scripts
│
├── frontend/
│   ├── app/
│   │   ├── (dashboard)/      # Protected pages
│   │   │   ├── users/
│   │   │   ├── departments/
│   │   │   ├── roles/
│   │   │   └── ...
│   │   └── login/
│   └── components/
│       ├── ui/               # shadcn/ui components
│       └── providers/        # Auth provider
│
└── docs/
    ├── dev/                  # Development docs
    │   ├── SESSION-2025-11-20-CRUD-COMPLETE.md
    │   └── ...
    ├── ERD.md
    ├── FUNCTIONAL_SPEC.md
    └── ...
```

---

## 🐛 Common Issues & Solutions

### Issue 1: 401 Unauthorized
**Solution**: Use `fetchJson` from `useAuth` hook, not manual token handling

### Issue 2: Data not showing after create
**Solution**: 
- fetchJson already unwraps .data, use `data` not `data?.data`
- Add 300ms delay before refetch: `setTimeout(() => refetch(), 300)`

### Issue 3: Browser cache (304)
**Solution**: Add to query:
```typescript
staleTime: 0,
refetchOnMount: 'always',
```

### Issue 4: Items not sorted
**Solution**: Sort on frontend:
```typescript
const items = ((data as any) || []).sort((a, b) => b.id - a.id);
```

### Issue 5: Multi-tenant issues
**Solution**: Always use `(tenant_id, field)` for unique constraints in database

---

## 🧪 Testing

### Manual Testing
1. **REST Client**: Use `test-api.http` (VS Code extension)
2. **Browser**: Test UI at `http://localhost:3000`
3. **Checklist**: Follow `TEST-CRUD-COMPLETE.md`

### Automated Testing
- **E2E**: Playwright tests in `frontend/tests/e2e.spec.ts`
- **Run**: `npm run test:e2e` (requires backend running)

---

## 🔑 Important Credentials

**Test Account**:
- Email: `admin@acme.local`
- Password: `admin123`
- Role: Admin (full permissions)

**Database**:
- Host: localhost:5432
- Database: wp_sign_db
- User: postgres
- Password: postgres123

---

## 🚦 Current Status

### Running Services
- **Backend**: `http://localhost:4000` (Process ID: 8)
- **Frontend**: `http://localhost:3000` (Process ID: 9)
- **Database**: PostgreSQL on port 5432
- **Redis**: Port 6379

### To Start Services
```bash
# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm run dev

# Database (Docker)
docker-compose up -d postgres redis
```

---

## 📝 Next Steps Recommendations

### Immediate (Today)
1. ✅ Test all CRUD operations (30 min)
2. ✅ Read documentation (15 min)
3. ✅ Familiarize with codebase (30 min)

### Short Term (This Week)
1. Start Phase 2: Workflow Engine
   - Read `PHASE-2-PLAN.md`
   - Create database tables (workflows, workflow_steps, etc.)
   - Implement backend modules
   - Create frontend UI

### Medium Term (Next Week)
1. Complete Phase 2
2. Start Phase 3: Incoming/Outgoing Documents

---

## 💡 Tips for Success

1. **Always read AGENTS.md first** - It has the full history
2. **Follow the patterns** - Don't reinvent, use existing patterns
3. **Use fetchJson** - Don't handle tokens manually
4. **Use toast** - Not alert()
5. **Test frequently** - Don't wait until the end
6. **Document as you go** - Update AGENTS.md with progress
7. **Ask questions** - Check LESSONS-LEARNED.md for common issues

---

## 📞 Need Help?

### Documentation
- `START-HERE-FOR-AI.md` - Onboarding
- `LESSONS-LEARNED.md` - Common pitfalls
- `CODE-MAP.md` - Architecture
- `AGENTS.md` - Full history

### Code Examples
- Look at existing pages: `users/page.tsx`, `roles/page.tsx`, `departments/page.tsx`
- All follow the same pattern

### Testing
- `test-api.http` - API examples
- `TEST-CRUD-COMPLETE.md` - Test checklist

---

## 🎉 Good Luck!

Phase 1 is complete and working great! The foundation is solid, patterns are established, and everything is documented. You're in a great position to continue with Phase 2.

**Remember**: 
- Read the docs first
- Follow the patterns
- Test frequently
- Have fun! 🚀

---

**Handoff Complete** ✅  
**Date**: 2025-11-20  
**Next Session**: Phase 2 - Workflow Engine
