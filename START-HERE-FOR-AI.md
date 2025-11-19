# 🚀 START HERE - Guide for Next AI

## 👤 Developer Info
- **Developer**: dev1
- **Project**: WP Sign E-Office (SaaS Multi-Tenant)
- **Status**: Phase 1 Complete, Ready for Phase 2

---

## 📚 MUST READ FILES (In Order)

### 1. **AGENTS.md** ⭐ MOST IMPORTANT
- Complete progress log
- What's done, what's next
- All sessions history
- Current status

### 2. **LESSONS-LEARNED.md** ⚠️ CRITICAL
- Common pitfalls and solutions
- Multi-tenant database rules
- Authentication patterns
- Debugging workflows

### 3. **ERD.md** 🗄️ DATABASE SOURCE OF TRUTH
- Complete database schema
- All tables and relationships
- Field definitions
- **ALWAYS check this before DB changes**

### 4. **ROADMAP-E-OFFICE.md** 🗺️
- 7-phase development plan (14 weeks)
- Phase 1: ✅ Complete
- Phase 2: 🔜 Next (Workflow Engine)

### 5. **FUNCTIONAL_SPEC.md** 📋
- Functional requirements
- Feature specifications
- Business logic

---

## 🏗️ Project Structure

```
PROJECT WP SIGN/
├── backend/                 # Node.js + Express + Prisma
│   ├── src/
│   │   ├── modules/        # Feature modules
│   │   ├── middleware/     # Auth, permissions
│   │   └── router/         # API routes
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── migrations/     # SQL migrations
│   └── scripts/            # Seed & utility scripts
│
├── frontend/               # Next.js 14 + shadcn/ui
│   ├── app/
│   │   ├── (dashboard)/   # Main app pages
│   │   └── (auth)/        # Login pages
│   └── components/
│       ├── ui/            # shadcn/ui components
│       └── providers/     # Auth provider
│
└── docs/                  # Documentation
```

---

## 🔑 Key Information

### Database
- **Type**: PostgreSQL (Multi-Tenant SaaS)
- **Connection**: `esign:esignpass@localhost:5432/esign`
- **Critical Rule**: ALWAYS include `tenant_id` in unique constraints
- **User**: `admin@acme.local` / `admin123`

### Ports
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Tech Stack
**Backend**:
- Node.js + Express + TypeScript
- Prisma ORM
- JWT authentication
- Permission-based access control

**Frontend**:
- Next.js 14 (App Router)
- React Query (TanStack Query)
- shadcn/ui + Tailwind CSS
- Sonner (toast notifications)

---

## ⚡ Quick Start Commands

```bash
# Backend
cd backend
npm run dev              # Start backend server

# Frontend
cd frontend
npm run dev              # Start frontend server

# Database
npx prisma db push       # Apply schema changes
npx prisma generate      # Generate Prisma client
node scripts/seed-rbac.js  # Seed RBAC data

# Check data
node scripts/check-db-data.js
```

---

## 🎯 Current Status (Session End)

### ✅ Completed Today
1. Setup shadcn/ui components
2. Upgraded 3 pages: Roles, Departments, Users
3. Fixed authentication (401/403 errors)
4. Added toast notifications (replaced alert)
5. Fixed data fetching & caching issues
6. Added sorting (newest first)
7. Added `code` field to departments table
8. Assigned Admin role to user

### 🐛 Known Issues
- Department `code` field added to DB but not yet in UI form
- Some pages still need shadcn/ui upgrade
- Browser cache can cause 304 issues (need hard refresh)

### 🔜 Next Steps
- Add "Mã phòng ban" field to department form
- Start Phase 2: Workflow Engine
- Upgrade remaining pages to shadcn/ui

---

## ⚠️ CRITICAL RULES

### Multi-Tenant Database
```sql
-- ✅ CORRECT: Unique per tenant
CREATE UNIQUE INDEX "table_tenant_id_code_key" 
ON "table"("tenant_id", "code");

-- ❌ WRONG: Global unique (breaks multi-tenant)
ALTER TABLE "table" ADD CONSTRAINT "table_code_key" UNIQUE ("code");
```

### Authentication
```typescript
// ✅ CORRECT: Use fetchJson from useAuth
const { fetchJson } = useAuth();
const data = await fetchJson('/api/endpoint');
// data is already unwrapped (no .data needed)

// ❌ WRONG: Manual fetch with localStorage
const token = localStorage.getItem('token'); // Wrong key!
```

### Data Fetching
```typescript
// ✅ CORRECT: fetchJson unwraps response.data
const roles = data || [];

// ❌ WRONG: Double unwrap
const roles = data?.data || []; // fetchJson already unwrapped!
```

---

## 📞 Communication with dev1

### Preferences
- Ngôn ngữ: Tiếng Việt (Vietnamese)
- Style: Thân thiện, ngắn gọn, đi thẳng vào vấn đề
- Không thích: Alert xấu của browser, UI không đẹp
- Quan tâm: Database integrity, SaaS multi-tenant correctness

### Important Notes
- dev1 rất cẩn thận về database (đúng!)
- Luôn check ERD.md trước khi thay đổi schema
- Test kỹ trước khi confirm
- Giải thích rõ ràng những gì đang làm

---

## 🆘 Troubleshooting

### 401 Unauthorized
1. Check token in localStorage: `esign.auth`
2. User might need Admin role assigned
3. Logout & login again to refresh token

### 403 Forbidden
1. User doesn't have required permissions
2. Run: `node scripts/quick-assign-admin.js`
3. Logout & login again

### Data not showing
1. Check backend logs for errors
2. Check database: `node scripts/check-db-data.js`
3. Hard refresh: Ctrl + Shift + R
4. Check response structure (fetchJson unwraps .data)

### 304 Not Modified (Cache)
1. Hard refresh: Ctrl + Shift + R
2. F12 → Network → Disable cache
3. Add `refetchOnMount: 'always'` to query

---

## 📖 Additional Resources

- `README-TESTING.md` - Testing guide
- `QUICK-START.md` - Quick start guide
- `CODE-MAP.md` - Code structure map
- `test-api.http` - API test cases
- `docs/` - Additional documentation

---

## 🎓 Learning from This Session

**Main Challenges Solved**:
1. Multi-tenant database constraints
2. Authentication token handling
3. React Query data unwrapping
4. Browser caching issues
5. shadcn/ui integration
6. Toast notifications

**Key Takeaways**:
- Always check ERD.md first
- Multi-tenant = tenant_id in everything
- fetchJson() unwraps response.data
- Hard refresh solves many issues
- Test with actual database queries

---

**Good luck! 🚀**

*Remember: Read AGENTS.md first, then LESSONS-LEARNED.md, then ERD.md*
