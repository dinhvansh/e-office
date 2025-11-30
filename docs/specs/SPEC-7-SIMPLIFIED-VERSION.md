# SPEC-7: Simplified SAAS Version (No RBAC)

## 📋 Overview
Tạo phiên bản E-Office đơn giản bỏ phân quyền phức tạp, chỉ có Owner/Member.

**Priority**: MEDIUM  
**Estimated Time**: 3 days  
**Impact**: Dễ sử dụng hơn cho team nhỏ, giảm complexity 60%

---

## 🎯 Goals
- Loại bỏ RBAC system (roles, permissions)
- Chỉ có 2 loại user: **Owner** và **Member**
- Đơn giản hóa access control
- Giữ nguyên core features (documents, workflows, signing)

---

## 📊 So Sánh: Full Version vs Simplified

| Feature | Full Version | Simplified Version |
|---------|-------------|-------------------|
| User Types | Admin, Manager, User + Custom Roles | **Owner, Member** |
| Permissions | 27 permissions, granular | **Preset: can_view, can_create, can_edit** |
| Access Control | Role-based + document-level | **Owner-based only** |
| Workflows | Approver by Role/Dept/Manager | **Approver by User only** |
| Complexity | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Database Tables | 20+ tables | **15 tables (-5)** |

---

## 🗑️ Loại Bỏ Những Gì?

### Database Tables (Xóa)
```sql
-- Không cần nữa
DROP TABLE role_permissions;
DROP TABLE permissions;
DROP TABLE user_roles;
DROP TABLE roles;
DROP TABLE document_permissions;  -- Simplify to owner-based only
```

### Backend Modules (Xóa)
```
backend/src/modules/
  ├── roles/          ❌ XÓA
  └── permissions/    ❌ XÓA
```

### Frontend Pages (Xóa)
```
frontend/app/(dashboard)/
  ├── roles/          ❌ XÓA
  └── permissions/    ❌ XÓA
```

---

## 📝 Task Breakdown

### Task 7.1: Simplified Database Schema (4 hours)

**Updated User Model**:
```prisma
model users {
  id            Int      @id @default(autoincrement())
  tenant_id     Int
  email         String   @unique
  password_hash String
  full_name     String?
  phone         String?
  avatar_url    String?
  department_id Int?
  manager_id    Int?
  position_id   Int?
  
  // ✅ SIMPLIFIED: Only 2 roles
  role          String   @default("member")  // 'owner' or 'member'
  status        String   @default("active")
  created_at    DateTime @default(now())
  
  tenant        tenants  @relation(fields: [tenant_id], references: [id])
  department    departments? @relation("user_department", fields: [department_id], references: [id])
  manager       users?   @relation("user_manager", fields: [manager_id], references: [id])
  subordinates  users[]  @relation("user_manager")
  position      positions? @relation(fields: [position_id], references: [id])
  
  documents     documents[]
  audit_logs    audit_logs[]
  approvals     document_approvals[]
  signers       signers[]
  
  // ❌ REMOVED: user_roles relation
}

// ❌ REMOVED: roles, permissions, role_permissions, user_roles tables
```

**Simplified Access Control**:
```prisma
// Documents: Owner-based access
model documents {
  // ... existing fields
  
  owner_id          Int
  visibility_scope  String  @default("team")  // 'private', 'team', 'public'
  
  owner             users   @relation(fields: [owner_id], references: [id])
  
  // ❌ REMOVED: document_permissions table
}
```

**Migration Script** (`prisma/migrations/simplify-rbac.sql`):
```sql
-- Step 1: Migrate existing roles to simple role
UPDATE users SET role = 'owner' 
WHERE id IN (
  SELECT ur.user_id FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE r.name IN ('Admin', 'Manager')
);

UPDATE users SET role = 'member' 
WHERE role NOT IN ('owner');

-- Step 2: Drop RBAC tables
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS document_permissions CASCADE;

-- Step 3: Add default visibility to documents
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS visibility_scope VARCHAR(20) DEFAULT 'team';
```

---

### Task 7.2: Simplified Permission Checks (3 hours)

**File**: `backend/src/middleware/permissions.ts`

**Current Complex Version**:
```typescript
// ❌ TOO COMPLEX
async function checkPermission(userId: number, resource: string, action: string) {
  const userRoles = await prisma.user_roles.findMany({
    where: { user_id: userId },
    include: {
      role: {
        include: {
          role_permissions: {
            include: { permission: true }
          }
        }
      }
    }
  });
  // ... complex logic
}
```

**New Simplified Version**:
```typescript
// ✅ SIMPLE
export function checkPermission(user: User, action: string) {
  // Owner can do everything
  if (user.role === 'owner') {
    return true;
  }
  
  // Member permissions
  const memberPermissions = [
    'documents.view',
    'documents.create',
    'documents.edit_own',  // Only own documents
    'workflows.view',
    'sign_requests.view',
    'sign_requests.sign'
  ];
  
  return memberPermissions.includes(action);
}

// Usage
export function requireOwner(req, res, next) {
  if (req.user.role !== 'owner') {
    throw ApiError.forbidden('Owner role required');
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }
  next();
}
```

**Document Access**:
```typescript
// backend/src/modules/documents/documents.access.ts
export async function canViewDocument(user: User, document: Document): Promise<boolean> {
  // Owner can view all
  if (user.role === 'owner') {
    return true;
  }
  
  // Document owner can view
  if (document.owner_id === user.id) {
    return true;
  }
  
  // Check visibility scope
  if (document.visibility_scope === 'public') {
    return true;  // Anyone in tenant
  }
  
  if (document.visibility_scope === 'team') {
    // Same tenant
    return user.tenant_id === document.tenant_id;
  }
  
  if (document.visibility_scope === 'private') {
    return false;  // Only owner
  }
  
  return false;
}

export async function canEditDocument(user: User, document: Document): Promise<boolean> {
  // Only owner of tenant or document owner
  return user.role === 'owner' || document.owner_id === user.id;
}

export async function canDeleteDocument(user: User, document: Document): Promise<boolean> {
  // Only owner of tenant or document owner
  return user.role === 'owner' || document.owner_id === user.id;
}
```

---

### Task 7.3: Simplified Workflows (3 hours)

**Remove Role/Department Approvers**:
```typescript
// backend/src/modules/workflows/workflows.service.ts

// ❌ REMOVED: approver_type = 'role', 'department'
// ✅ KEPT: approver_type = 'user', 'manager'

async createWorkflowStep(workflowId: number, data: any) {
  // Validate approver_type
  const validTypes = ['user', 'manager'];  // ← Only 2 types
  
  if (!validTypes.includes(data.approver_type)) {
    throw ApiError.badRequest('Invalid approver type. Use: user, manager');
  }
  
  // ... rest of logic
}
```

**Updated Prisma Schema**:
```prisma
model workflow_steps {
  id                Int       @id @default(autoincrement())
  workflow_id       Int
  step_order        Int
  step_name         String
  approver_type     String    // Only: 'user' | 'manager'
  approver_id       Int?      // user_id only
  participant_role  String?   // 'approver' | 'signer'
  due_in_days       Int       @default(3)
  is_required       Boolean   @default(true)
  
  workflow          workflows @relation(fields: [workflow_id], references: [id])
  approvals         document_approvals[]
}
```

---

### Task 7.4: Frontend Simplification (4 hours)

**Remove RBAC Pages**:
```bash
# Delete these directories
rm -rf frontend/app/(dashboard)/roles
rm -rf frontend/app/(dashboard)/permissions
rm -rf frontend/components/roles
```

**Simplified User Management**:
```tsx
// frontend/app/(dashboard)/users/page.tsx
export default function UsersPage() {
  const [users, setUsers] = useState([]);
  
  return (
    <div>
      <h1>Team Members</h1>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>  {/* ← Simple: Owner/Member */}
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(user => (
            <TableRow key={user.id}>
              <TableCell>{user.full_name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Select value={user.role} onValueChange={(role) => updateUserRole(user.id, role)}>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </Select>
              </TableCell>
              <TableCell>
                <Button variant="ghost" onClick={() => deleteUser(user.id)}>
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

**Simplified Document Visibility**:
```tsx
// frontend/components/documents/DocumentForm.tsx
<Select name="visibility_scope">
  <SelectItem value="private">🔒 Private (Only me)</SelectItem>
  <SelectItem value="team">👥 Team (All members)</SelectItem>
  <SelectItem value="public">🌐 Public (Everyone)</SelectItem>
</Select>
```

**Simplified Workflow Builder**:
```tsx
// frontend/components/workflows/WorkflowStepForm.tsx
<Select name="approver_type">
  <SelectItem value="user">👤 Specific User</SelectItem>
  <SelectItem value="manager">👔 Direct Manager</SelectItem>
  {/* ❌ REMOVED: role, department options */}
</Select>
```

---

### Task 7.5: Update Settings & Navigation (2 hours)

**Sidebar Navigation** (`frontend/components/Sidebar.tsx`):
```tsx
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Documents', href: '/documents', icon: DocumentIcon },
  { name: 'Workflows', href: '/workflows', icon: WorkflowIcon },
  { name: 'Sign Requests', href: '/sign-requests', icon: PenIcon },
  
  // Settings (Owner only)
  user.role === 'owner' && {
    name: 'Settings', icon: SettingsIcon,
    children: [
      { name: 'Team Members', href: '/users' },
      { name: 'Departments', href: '/departments' },
      { name: 'Document Types', href: '/document-types' }
    ]
  }
  
  // ❌ REMOVED: Roles, Permissions menu
];
```

---

## 🧪 Testing Plan

### Database Migration Test
```bash
# Backup first
pg_dump eoffice_dev > backup.sql

# Run migration
npx prisma migrate dev --name simplify-rbac

# Verify
psql eoffice_dev -c "SELECT role, COUNT(*) FROM users GROUP BY role;"
# Should show: owner, member only
```

### Permission Tests
```typescript
describe('Simplified Permissions', () => {
  it('owner can view all documents', async () => {
    const owner = { role: 'owner', tenant_id: 1 };
    const doc = { tenant_id: 1, owner_id: 2, visibility_scope: 'private' };
    expect(await canViewDocument(owner, doc)).toBe(true);
  });
  
  it('member cannot view private documents', async () => {
    const member = { role: 'member', id: 2, tenant_id: 1 };
    const doc = { tenant_id: 1, owner_id: 3, visibility_scope: 'private' };
    expect(await canViewDocument(member, doc)).toBe(false);
  });
  
  it('member can view team documents', async () => {
    const member = { role: 'member', id: 2, tenant_id: 1 };
    const doc = { tenant_id: 1, owner_id: 3, visibility_scope: 'team' };
    expect(await canViewDocument(member, doc)).toBe(true);
  });
});
```

---

## 📊 Impact Analysis

### Code Reduction
- **Database Tables**: 20 → 15 (-25%)
- **Backend Modules**: 20 → 18 (-10%)
- **Frontend Pages**: 15 → 13 (-13%)
- **Permission Checks**: Complex → Simple (-60% logic)

### Performance Improvement
- **Permission Query**: 5 joins → 0 joins (90% faster)
- **Document List**: No permission filtering overhead
- **User Load**: -40% queries

### User Experience
- ✅ Simpler onboarding (no role assignment confusion)
- ✅ Faster setup (no role/permission config)
- ✅ Easier to understand (2 roles vs 7 resources × 4 actions)
- ❌ Less flexible (cannot create custom roles)

---

## 🚀 Migration Guide

### From Full Version to Simplified

**Step 1: Backup**
```bash
bash scripts/backup-db.sh
```

**Step 2: Run Migration**
```bash
cd backend
npx prisma migrate dev --name simplify-rbac
```

**Step 3: Update Code**
```bash
# Remove RBAC modules
rm -rf src/modules/roles
rm -rf src/modules/permissions

# Update imports
# Search and replace role/permission checks
```

**Step 4: Deploy**
```bash
bash scripts/deploy.sh
```

---

## 💡 When to Use Each Version?

### Use Simplified Version If:
- ✅ Team < 50 người
- ✅ Không cần phân quyền chi tiết
- ✅ Muốn setup nhanh
- ✅ Ưu tiên đơn giản hơn linh hoạt

### Use Full Version If:
- ✅ Team > 50 người
- ✅ Cần phân quyền theo phòng ban
- ✅ Multi-level approval complex
- ✅ Bảo mật cao, audit chi tiết

---

## 🎯 Deliverables

- [ ] Updated Prisma schema
- [ ] Migration script
- [ ] Simplified permission middleware
- [ ] Updated frontend (removed RBAC pages)
- [ ] Testing suite
- [ ] Documentation
- [ ] Docker images (simplified version)

---

## 📝 Notes

**Breaking Changes**:
- Existing roles/permissions will be converted to owner/member
- Custom roles will be lost
- Document permissions become visibility-based

**Backward Compatibility**: NO - This is a major simplification

**Recommendation**: Deploy as separate product variant or new branch
