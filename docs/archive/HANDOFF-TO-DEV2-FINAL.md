# 🚀 Handoff Document for Dev2

**Date**: 2025-11-21  
**From**: Dev1 + AI Assistant (Kiro)  
**To**: Dev2  
**Project**: E-Office System

---

## � Loglin Credentials

### Admin Account
```
Email: admin@acme.local
Password: password123
```

### Test Users
```
User A: usera@test.local / password123
User B: userb@test.local / password123
Van: vanqn95@gamil.com / password123
```

---

## 🗄️ Database Info

### PostgreSQL
```
Host: localhost
Port: 5432
Database: esign
User: postgres
Password: postgres
```

### Connection String
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/esign?schema=public"
```

---

## 📦 Dependencies Installed

### Backend (Node.js)
```json
{
  "@prisma/client": "^5.22.0",
  "bcrypt": "^5.1.1",
  "cors": "^2.8.5",
  "express": "^4.18.2",
  "helmet": "^7.1.0",
  "jsonwebtoken": "^9.0.2",
  "morgan": "^1.10.0",
  "multer": "^1.4.5-lts.1",
  "nodemailer": "^6.9.7",
  "zod": "^3.22.4"
}
```

**No new dependencies added in this session**

### Frontend (Next.js)
```json
{
  "next": "14.0.4",
  "react": "^18.2.0",
  "react-query": "^3.39.3",
  "@tanstack/react-query": "^5.14.2",
  "tailwindcss": "^3.3.6",
  "sonner": "^1.2.3",
  "@radix-ui/react-dialog": "^1.0.5",
  "@radix-ui/react-label": "^2.0.2"
}
```

**No new dependencies added in this session**

---

## 🚀 Quick Start

### 1. Start Database
```bash
# PostgreSQL should be running on port 5432
# Redis should be running on port 6379 (optional)
```

### 2. Start Backend
```bash
cd backend
npm install  # If needed
npm run dev  # Port 4000
```

### 3. Start Frontend
```bash
cd frontend
npm install  # If needed
npm run dev  # Port 3000
```

### 4. Access Application
```
Frontend: http://localhost:3000
Backend API: http://localhost:4000/api/v1
```

---

## 📊 Database Schema Updates

### New Tables (Session 2025-11-21)

#### 1. **positions** (NEW)
```sql
CREATE TABLE positions (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  level INT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);
```

**Purpose**: Job titles/positions (CEO, Manager, Staff, etc.)  
**Seed Data**: 12 positions (CEO, CFO, CTO, COO, Director, HOD, Manager, Supervisor, Team Lead, Senior, Staff, Intern)

### Modified Tables

#### 1. **users** (UPDATED)
**New Fields**:
```sql
ALTER TABLE users ADD COLUMN manager_id INT;
ALTER TABLE users ADD COLUMN position_id INT;
ALTER TABLE users ADD FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD FOREIGN KEY (position_id) REFERENCES positions(id);
```

**Purpose**: 
- `manager_id`: Direct manager relationship (for workflow "manager" approver type)
- `position_id`: Job title (for workflow "position" approver type)

#### 2. **workflow_steps** (UPDATED)
**New Field**:
```sql
ALTER TABLE workflow_steps ADD COLUMN is_parallel BOOLEAN DEFAULT false;
```

**Purpose**: For future parallel approval feature (not implemented yet)  
**Note**: Field exists but logic not implemented

### Complete Database Setup

**Option 1: Run All Seeds at Once** (RECOMMENDED)
```bash
cd backend
node scripts/setup-complete-database.js
```

**Option 2: Run Individually**
```bash
cd backend

# 1. Basic seed (users, roles, permissions, departments)
node scripts/seed.js

# 2. Positions (12 job titles)
node scripts/seed-positions.js

# 3. Positions permissions (4 permissions)
node scripts/seed-positions-permissions.js

# 4. External organizations (5 sample orgs)
node scripts/seed-external-orgs.js

# 5. Workflows (3 sample workflows)
node scripts/seed-workflows.js

# 6. Assign admin role
node scripts/assign-admin-to-acme-local.js
```

### What Gets Created

After running setup:
- ✅ 1 Admin user (admin@acme.local)
- ✅ 4 Roles (Admin, Manager, User, Viewer)
- ✅ 39 Permissions (including 4 new for positions)
- ✅ 3 Departments (IT, HR, Finance)
- ✅ 12 Positions (CEO → Intern)
- ✅ 5 External Organizations
- ✅ 3 Workflows (Simple, 2-Level, Contract)
- ✅ 8 Document Types

---

## 🆕 New Features (Session 2025-11-21)

### 1. Positions System ✅
**Location**: `/positions`

**Features**:
- Full CRUD for job titles
- Statistics dashboard
- User count per position
- Level-based hierarchy

**Files**:
- Backend: `backend/src/modules/positions/`
- Frontend: `frontend/app/(dashboard)/positions/page.tsx`
- Tests: `backend/scripts/test-positions-api.js`

### 2. User Position & Manager Fields ✅
**Location**: `/users`

**Features**:
- Position dropdown in user form
- Manager dropdown in user form
- Display in users table

**Files**:
- Backend: `backend/src/modules/users/users.repository.ts`
- Frontend: `frontend/app/(dashboard)/users/page.tsx`
- Tests: `backend/scripts/test-user-position-manager.js`

### 3. Searchable Select Component ✅
**Location**: `frontend/components/ui/searchable-select.tsx`

**Features**:
- Search by name or email
- Click outside to close
- Auto-focus on search input
- Modern UI with checkmark

**Usage**:
```tsx
<SearchableSelect
  options={users.map(u => ({
    value: u.id,
    label: `${u.full_name} (${u.email})`
  }))}
  value={selectedUserId}
  onChange={(value) => setSelectedUserId(value)}
  placeholder="-- Chọn người phê duyệt --"
/>
```

### 4. Workflow Approver Selection Fixed ✅
**Location**: 
- `frontend/components/workflow/AdhocWorkflowBuilder.tsx`
- `frontend/components/workflow/WorkflowCustomizer.tsx`

**Fixes**:
- Fixed data structure mismatch
- Added searchable dropdown
- Display name + email

---

## 🧪 Testing

### Run All Tests
```bash
cd backend

# Positions API (6 tests)
node scripts/test-positions-api.js

# User Position & Manager (7 tests)
node scripts/test-user-position-manager.js

# Workflow modes (6 tests)
node scripts/test-4-workflow-modes.js
```

### Expected Results
- All tests should pass ✅
- Total: 19 tests

---

## 📁 Project Structure

```
e-office/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── positions/          ← NEW
│   │   │   ├── users/              ← UPDATED
│   │   │   ├── workflows/
│   │   │   ├── approvals/
│   │   │   └── ...
│   │   └── ...
│   ├── scripts/
│   │   ├── seed-positions.js       ← NEW
│   │   ├── test-positions-api.js   ← NEW
│   │   └── ...
│   └── prisma/
│       └── schema.prisma           ← UPDATED
│
├── frontend/
│   ├── app/(dashboard)/
│   │   ├── positions/              ← NEW
│   │   ├── users/                  ← UPDATED
│   │   └── ...
│   └── components/
│       ├── ui/
│       │   └── searchable-select.tsx ← NEW
│       └── workflow/               ← UPDATED
│
└── docs/
    └── dev/
        ├── FEATURE-POSITIONS-COMPLETE.md
        ├── FEATURE-USER-POSITION-MANAGER-COMPLETE.md
        ├── FEATURE-PARALLEL-APPROVAL-PLAN.md
        └── ...
```

---

## 🔧 Configuration Files

### Backend `.env`
```env
NODE_ENV=development
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/esign?schema=public"
JWT_SECRET=your-secret-key-here-change-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
STORAGE_BASE_PATH=./uploads
```

### Frontend `.env.local`
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

---

## 📝 Important Notes

### 1. Permissions
Make sure admin user has all permissions:
```bash
cd backend
node scripts/seed-positions-permissions.js
node scripts/assign-admin-to-acme-local.js
```

### 2. File Uploads
Upload folder: `backend/uploads/`
- Make sure this folder exists
- Check write permissions

### 3. Database Migrations
If schema changes:
```bash
cd backend
npx prisma db push
npx prisma generate
```

### 4. Common Issues

**Issue**: "Unauthorized" errors
**Fix**: 
```bash
node backend/scripts/assign-admin-to-acme-local.js
```

**Issue**: Positions not showing
**Fix**:
```bash
node backend/scripts/seed-positions.js
node backend/scripts/seed-positions-permissions.js
```

**Issue**: Users dropdown empty in workflow
**Fix**: Check if users exist, run `node backend/scripts/seed.js`

---

## 🎯 Current Status

### ✅ Completed Features
- [x] Phase 0: E-Signature Base
- [x] Phase 1: Document Types + Auto-numbering
- [x] Phase 1.5: UI Refactor + RBAC
- [x] Phase 2: Workflow Engine (90%)
- [x] Positions System
- [x] User Position & Manager Fields
- [x] Searchable Select Component

### 🚧 In Progress
- [ ] Parallel Approval (Planned, not started)
- [ ] Email Notifications (Partially done)
- [ ] Deadline Tracking & Reminders

### 📋 TODO
- [ ] Phase 3: Incoming/Outgoing Documents
- [ ] Phase 4: Advanced Features
- [ ] Phase 5: Dashboard & Reporting
- [ ] Phase 6: Integrations & Polish
- [ ] Phase 7: Testing & Optimization

---

## 📚 Documentation

### Key Documents
1. **README.md** - Project overview
2. **QUICK-START.md** - Quick start guide
3. **agents.md** - Development progress log
4. **ROADMAP-E-OFFICE.md** - 7-phase development plan
5. **ERD.md** - Database schema
6. **FUNCTIONAL_SPEC.md** - Functional requirements

### Session Reports
- `docs/dev/SESSION-2025-11-21-POSITIONS-MANAGER-TESTING.md`
- `docs/dev/FEATURE-POSITIONS-COMPLETE.md`
- `docs/dev/FEATURE-USER-POSITION-MANAGER-COMPLETE.md`
- `docs/dev/FEATURE-PARALLEL-APPROVAL-PLAN.md`

### API Testing
- `test-api.http` - REST Client file (VS Code extension)
- `test-workflows.http` - Workflow API tests
- `test-positions.http` - Positions API tests

---

## 🐛 Known Issues

### 1. Parallel Approval
- Database field added (`is_parallel`)
- Backend logic NOT implemented yet
- Frontend UI NOT implemented yet
- See: `docs/dev/FEATURE-PARALLEL-APPROVAL-PLAN.md`

### 2. Email Notifications
- Basic email service exists
- Not integrated with workflow approvals yet
- Need to configure SMTP in `.env`

### 3. File Path Security
- `file_path` hidden from API responses
- Path traversal protection implemented
- See: `docs/dev/TASK-DOCUMENT-FILE-PATH-HARDENING-COMPLETE.md`

---

## 🔄 Git Status

### Latest Commits
```
feat: Add searchable select component for workflow approvers
feat: Add position and manager fields to users
feat: Implement positions system with full CRUD
feat: Add parallel approval database schema (not implemented)
```

### Branch
```
main (or your current branch)
```

---

## 💡 Tips for Dev2

### 1. Start with Testing
Run all test scripts to make sure everything works:
```bash
cd backend
node scripts/test-positions-api.js
node scripts/test-user-position-manager.js
```

### 2. Check Database
```bash
cd backend
npx prisma studio  # Visual database browser
```

### 3. Read Documentation
- Start with `README.md`
- Then `QUICK-START.md`
- Check `agents.md` for latest progress

### 4. Use REST Client
Install "REST Client" VS Code extension, then open:
- `test-api.http`
- `test-workflows.http`

### 5. Common Commands
```bash
# Backend
cd backend
npm run dev          # Start dev server
npx prisma studio    # Database GUI
npx prisma db push   # Push schema changes

# Frontend
cd frontend
npm run dev          # Start dev server
npm run build        # Build for production
```

---

## 📞 Contact

If you have questions:
1. Check `agents.md` for latest progress
2. Check `docs/dev/` for detailed documentation
3. Check `TODO-WORKFLOW-IMPLEMENTATION.md` for pending tasks

---

## ✅ Checklist for Dev2

Before starting work:
- [ ] Clone/pull latest code
- [ ] Install dependencies (`npm install` in both folders)
- [ ] Start PostgreSQL database
- [ ] Run seed scripts
- [ ] Start backend (`npm run dev`)
- [ ] Start frontend (`npm run dev`)
- [ ] Login with admin@acme.local / password123
- [ ] Run test scripts to verify everything works
- [ ] Read `agents.md` for latest progress
- [ ] Check `TODO-WORKFLOW-IMPLEMENTATION.md` for next tasks

---

**Good luck! 🚀**

If anything is unclear, check the documentation or test scripts for examples.
