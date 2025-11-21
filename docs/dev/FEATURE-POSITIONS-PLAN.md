# Feature Plan: Positions (Chức danh)

**Date**: 2025-11-21  
**Estimated Time**: 2-3 hours  
**Priority**: High  
**Status**: Planning

---

## 🎯 Mục tiêu

Tạo hệ thống quản lý **Chức danh** (Positions/Job Titles) để:
1. Định nghĩa các chức danh trong tổ chức (HOD, CEO, Manager, v.v.)
2. Gán chức danh cho users
3. Sử dụng chức danh trong workflow approval (chọn "HOD" → tự động tìm người có chức danh HOD)

---

## 📋 Yêu cầu

### Use Cases

**UC1: Quản lý chức danh**
- Admin tạo/sửa/xóa chức danh
- Mỗi chức danh có: code, name, description, level (cấp bậc)

**UC2: Gán chức danh cho user**
- Khi tạo/edit user, chọn chức danh từ dropdown
- 1 user có 1 chức danh (hoặc không có)

**UC3: Workflow với chức danh**
- Khi tạo workflow step, chọn loại "Chức danh"
- Chọn chức danh cụ thể (ví dụ: HOD)
- Khi document được submit, system tìm tất cả users có chức danh đó
- Tạo approval cho những users đó

---

## 🗄️ Database Schema

### Bảng `positions`

```prisma
model positions {
  id          Int      @id @default(autoincrement())
  tenant_id   Int
  code        String   // HOD, CEO, CFO, MANAGER, STAFF
  name        String   // Head of Department, Chief Executive Officer
  description String?
  level       Int?     // Cấp bậc: 1=CEO, 2=Director, 3=Manager, 4=Staff
  is_active   Boolean  @default(true)
  created_at  DateTime @default(now())
  
  tenant      tenants  @relation(fields: [tenant_id], references: [id])
  users       users[]  @relation("user_position")
  
  @@unique([tenant_id, code])
  @@index([tenant_id])
}
```

### Update bảng `users`

```prisma
model users {
  // ... existing fields
  position_id   Int?
  
  // ... existing relations
  position      positions? @relation("user_position", fields: [position_id], references: [id])
}
```

### Update bảng `workflow_steps`

Không cần thay đổi! Sử dụng lại:
- `approver_type = 'position'` (thêm type mới)
- `approver_id = position.id`

---

## 🏗️ Implementation Plan

### Phase 1: Database (15 mins)

**Files:**
- `backend/prisma/schema.prisma`

**Tasks:**
1. Add `positions` model
2. Add `position_id` to `users` model
3. Run `npx prisma db push`
4. Run `npx prisma generate`

---

### Phase 2: Backend - Positions Module (45 mins)

**Files to create:**
- `backend/src/modules/positions/positions.repository.ts`
- `backend/src/modules/positions/positions.service.ts`
- `backend/src/modules/positions/positions.controller.ts`
- `backend/src/modules/positions/positions.routes.ts`

**API Endpoints:**
```
GET    /api/v1/positions           - List positions
GET    /api/v1/positions/:id       - Get position by ID
POST   /api/v1/positions           - Create position
PUT    /api/v1/positions/:id       - Update position
DELETE /api/v1/positions/:id       - Delete position
GET    /api/v1/positions/stats     - Get stats
```

**Repository Methods:**
```typescript
- findByTenant(tenantId, filters?)
- findById(id, tenantId)
- findByCode(code, tenantId)
- create(data)
- update(id, data)
- delete(id)
- getStats(tenantId)
```

**Service Methods:**
```typescript
- getPositions(tenantId, filters?)
- getPositionById(id, tenantId)
- createPosition(tenantId, data)
- updatePosition(id, tenantId, data)
- deletePosition(id, tenantId)
- getStats(tenantId)
```

**Validation:**
- Code must be unique per tenant
- Cannot delete position if users are using it
- Level must be positive integer

---

### Phase 3: Backend - Update Users Module (15 mins)

**Files to update:**
- `backend/src/modules/users/users.service.ts`
- `backend/src/modules/users/users.repository.ts`

**Changes:**
1. Add `position_id` to createUser() parameters
2. Add `position_id` to updateUser() parameters
3. Include position in user queries

---

### Phase 4: Backend - Update Approvals Logic (30 mins)

**Files to update:**
- `backend/src/modules/approvals/approvals.repository.ts`

**Update `getApproversForStep()`:**
```typescript
case 'position':
  if (step.approver_id) {
    // Get all users with this position
    const usersWithPosition = await prisma.users.findMany({
      where: {
        position_id: step.approver_id,
        tenant_id: tenantId,
        status: 'active',
      },
      select: { id: true },
    });
    approverIds.push(...usersWithPosition.map(u => u.id));
  }
  break;
```

---

### Phase 5: Frontend - Positions Page (45 mins)

**File to create:**
- `frontend/app/(dashboard)/positions/page.tsx`

**Features:**
- List positions in grid/table
- Create position modal
- Edit position modal
- Delete position (with confirmation)
- Show user count per position
- Filter by active/inactive

**UI Components:**
- PageHeader
- Card grid layout
- Dialog for create/edit
- Badge for level
- Empty state

---

### Phase 6: Frontend - Update Users Page (15 mins)

**File to update:**
- `frontend/app/(dashboard)/users/page.tsx`

**Changes:**
1. Fetch positions list
2. Add position dropdown to form
3. Show position in users table
4. Load position_id when editing

---

### Phase 7: Frontend - Update Workflow Components (30 mins)

**Files to update:**
- `frontend/components/workflow/WorkflowCustomizer.tsx`
- `frontend/components/workflow/AdhocWorkflowBuilder.tsx`
- `frontend/app/(dashboard)/workflows/page.tsx`

**Changes:**
1. Add approver_type dropdown (user/role/department/position/manager)
2. Conditional approver selection based on type:
   - user → user dropdown
   - role → role dropdown
   - department → department dropdown
   - position → position dropdown
   - manager → no selection (auto)
3. Update step display to show position name

---

### Phase 8: Seed Data (15 mins)

**File to create:**
- `backend/scripts/seed-positions.js`

**Sample positions:**
```javascript
[
  { code: 'CEO', name: 'Chief Executive Officer', level: 1 },
  { code: 'CFO', name: 'Chief Financial Officer', level: 2 },
  { code: 'CTO', name: 'Chief Technology Officer', level: 2 },
  { code: 'DIRECTOR', name: 'Director', level: 3 },
  { code: 'HOD', name: 'Head of Department', level: 4 },
  { code: 'MANAGER', name: 'Manager', level: 5 },
  { code: 'SUPERVISOR', name: 'Supervisor', level: 6 },
  { code: 'STAFF', name: 'Staff', level: 7 },
]
```

---

### Phase 9: Testing (30 mins)

**Test Cases:**

1. **CRUD Positions**
   - Create position
   - Edit position
   - Delete position (with/without users)
   - List positions

2. **Assign Position to User**
   - Create user with position
   - Edit user position
   - View user with position

3. **Workflow with Position**
   - Create workflow step with position type
   - Upload document
   - Verify approval sent to users with that position

---

## 📊 Database Migration

```sql
-- Create positions table
CREATE TABLE positions (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  level INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

-- Add position_id to users
ALTER TABLE users ADD COLUMN position_id INTEGER REFERENCES positions(id);

-- Create index
CREATE INDEX idx_positions_tenant ON positions(tenant_id);
CREATE INDEX idx_users_position ON users(position_id);
```

---

## 🎨 UI Mockup

### Positions Page

```
┌─────────────────────────────────────────────────┐
│ 📋 Quản lý chức danh                    [+ Thêm]│
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ 👔 CEO   │  │ 💼 CFO   │  │ 🎯 CTO   │      │
│  │ Level: 1 │  │ Level: 2 │  │ Level: 2 │      │
│  │ 1 người  │  │ 2 người  │  │ 3 người  │      │
│  │ [✏️] [🗑️]│  │ [✏️] [🗑️]│  │ [✏️] [🗑️]│      │
│  └──────────┘  └──────────┘  └──────────┘      │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ 🏢 HOD   │  │ 👨‍💼 MGR  │  │ 👤 STAFF │      │
│  │ Level: 4 │  │ Level: 5 │  │ Level: 7 │      │
│  │ 5 người  │  │ 12 người │  │ 45 người │      │
│  │ [✏️] [🗑️]│  │ [✏️] [🗑️]│  │ [✏️] [🗑️]│      │
│  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────┘
```

### Users Form (Updated)

```
┌─────────────────────────────────────┐
│ Thêm người dùng                     │
├─────────────────────────────────────┤
│ Email: [________________]           │
│ Họ tên: [________________]          │
│ Phòng ban: [▼ Chọn phòng ban]      │
│ Chức danh: [▼ Chọn chức danh]  ← NEW│
│ Quản lý: [▼ Chọn quản lý]          │
│ Vai trò: ☑ Admin ☐ Manager         │
│                                     │
│           [Hủy]  [Tạo mới]         │
└─────────────────────────────────────┘
```

### Workflow Step Form (Updated)

```
┌─────────────────────────────────────┐
│ Thêm bước phê duyệt                 │
├─────────────────────────────────────┤
│ Tên bước: [________________]        │
│                                     │
│ Loại người duyệt: [▼ Chọn loại] ← NEW│
│   • Người dùng                      │
│   • Vai trò                         │
│   • Phòng ban                       │
│   • Chức danh          ← NEW        │
│   • Quản lý trực tiếp               │
│                                     │
│ Chọn chức danh: [▼ HOD]        ← NEW│
│                                     │
│ Thời hạn: [3] ngày                  │
│                                     │
│           [Hủy]  [Thêm]            │
└─────────────────────────────────────┘
```

---

## 🔧 Technical Details

### Approver Type Logic

```typescript
switch (approver_type) {
  case 'user':
    // Chọn 1 user cụ thể
    approverIds = [approver_id];
    break;
    
  case 'role':
    // Tất cả users có role này
    approverIds = getUsersByRole(approver_id);
    break;
    
  case 'department':
    // Manager của phòng ban
    approverIds = [getDepartmentManager(approver_id)];
    break;
    
  case 'position':  // ← NEW
    // Tất cả users có chức danh này
    approverIds = getUsersByPosition(approver_id);
    break;
    
  case 'manager':
    // Quản lý trực tiếp của document owner
    approverIds = [getDirectManager(document.owner_id)];
    break;
}
```

---

## ✅ Acceptance Criteria

- [ ] Positions table created in database
- [ ] CRUD API for positions working
- [ ] Positions page UI complete
- [ ] Can create/edit/delete positions
- [ ] Users can be assigned positions
- [ ] Position dropdown in users form
- [ ] Workflow supports position approver type
- [ ] Approver type dropdown in workflow forms
- [ ] Position selection in workflow forms
- [ ] Approval sent to users with correct position
- [ ] Seed data script created
- [ ] All tests passing
- [ ] No TypeScript errors

---

## 📝 Example Workflow

**Scenario**: Văn bản cần HOD duyệt

1. Admin tạo position "HOD" (Head of Department)
2. Admin gán chức danh "HOD" cho User A và User B
3. Admin tạo workflow với step:
   - approver_type = 'position'
   - approver_id = 1 (HOD position)
4. User C upload document
5. System tìm tất cả users có position_id = 1
6. System tạo approval cho User A và User B
7. User A hoặc User B approve → document tiếp tục

---

## 🚀 Benefits

1. **Linh hoạt**: Dễ dàng thêm/sửa chức danh
2. **Tự động**: Workflow tự động tìm người duyệt theo chức danh
3. **Mở rộng**: Có thể có nhiều người cùng chức danh
4. **Rõ ràng**: Phân cấp bậc (level) giúp hiểu cấu trúc tổ chức
5. **Dễ quản lý**: Thay đổi người → chỉ cần đổi chức danh, không cần sửa workflow

---

## 📊 Estimated Time Breakdown

| Phase | Task | Time |
|-------|------|------|
| 1 | Database schema | 15 mins |
| 2 | Backend - Positions module | 45 mins |
| 3 | Backend - Update users | 15 mins |
| 4 | Backend - Update approvals | 30 mins |
| 5 | Frontend - Positions page | 45 mins |
| 6 | Frontend - Update users page | 15 mins |
| 7 | Frontend - Update workflow | 30 mins |
| 8 | Seed data | 15 mins |
| 9 | Testing | 30 mins |
| **Total** | | **3 hours** |

---

## 🔜 Next Steps

1. Review plan với team
2. Approve plan
3. Start implementation
4. Test thoroughly
5. Deploy to production

---

**Status**: Ready for implementation  
**Complexity**: Medium  
**Risk**: Low  
**Priority**: High

