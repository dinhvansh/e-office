# Feature: Manager Field for Users

**Date**: 2025-11-21  
**Status**: ✅ COMPLETE  
**Duration**: ~15 minutes

---

## 🎯 Problem

Workflow system có loại người phê duyệt "Quản lý trực tiếp" (manager) nhưng chưa có chỗ nào cấu hình manager cho user.

---

## ✅ Solution

Thêm field `manager_id` vào bảng `users` và UI để chọn quản lý trực tiếp.

---

## 📊 Changes

### 1. Database Schema ✅

**File**: `backend/prisma/schema.prisma`

**Added:**
```prisma
model users {
  // ... existing fields
  manager_id    Int?       // Quản lý trực tiếp
  
  // Relations
  manager       users?     @relation("user_manager", fields: [manager_id], references: [id], onDelete: SetNull)
  subordinates  users[]    @relation("user_manager")
}
```

**Migration:**
```bash
npx prisma db push
```

**Result:** ✅ Success

---

### 2. Backend Service ✅

**File**: `backend/src/modules/users/users.service.ts`

**Updated:**
- `createUser()` - Added `manager_id` parameter
- `updateUser()` - Added `manager_id` parameter

**Changes:**
```typescript
async createUser(tenantId: number, data: {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
  department_id?: number;
  manager_id?: number;  // ✅ Added
  role_ids?: number[];
})

async updateUser(id: number, tenantId: number, data: {
  full_name?: string;
  phone?: string;
  department_id?: number;
  manager_id?: number;  // ✅ Added
  status?: string;
  role_ids?: number[];
  password?: string;
})
```

---

### 3. Frontend UI ✅

**File**: `frontend/app/(dashboard)/users/page.tsx`

**Added:**
1. `manager_id` to formData state
2. Manager dropdown in create/edit form
3. Load manager_id when editing user

**UI Component:**
```tsx
<div className="space-y-2">
  <Label htmlFor="manager_id">Quản lý trực tiếp</Label>
  <select
    id="manager_id"
    value={formData.manager_id}
    onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
    className="w-full px-3 py-2 border border-input rounded-md"
  >
    <option value="">-- Không có --</option>
    {users.filter((u: User) => u.id !== editingUser?.id).map((user: User) => (
      <option key={user.id} value={user.id}>
        {user.full_name || user.email}
      </option>
    ))}
  </select>
  <p className="text-xs text-muted-foreground">
    Dùng cho workflow "Quản lý trực tiếp"
  </p>
</div>
```

**Features:**
- Dropdown shows all users except current user (prevent self-reference)
- Shows full name or email
- Optional field (can be empty)
- Helper text explains usage

---

## 🔧 How It Works

### Workflow with Manager Approver

When creating a workflow step with `approver_type = 'manager'`:

1. User uploads document
2. System finds document owner
3. System looks up owner's `manager_id`
4. Creates approval for the manager
5. Manager receives notification

**Example:**
```
User A (manager_id = 2) uploads document
→ Workflow step: approver_type = 'manager'
→ System finds User A's manager (User B, id=2)
→ Creates approval for User B
```

---

## 🧪 Testing

### Test Case 1: Create User with Manager

**Steps:**
1. Go to Users page
2. Click "Thêm người dùng"
3. Fill in email, password, name
4. Select manager from dropdown
5. Click "Tạo"

**Expected:**
- ✅ User created successfully
- ✅ Manager relationship saved

### Test Case 2: Edit User Manager

**Steps:**
1. Go to Users page
2. Click Edit on a user
3. Change manager dropdown
4. Click "Cập nhật"

**Expected:**
- ✅ User updated successfully
- ✅ Manager relationship updated

### Test Case 3: Workflow with Manager

**Steps:**
1. Create workflow with step: approver_type = 'manager'
2. User A (has manager) uploads document
3. Check approvals

**Expected:**
- ✅ Approval created for User A's manager
- ✅ Manager sees pending approval

---

## 📝 Database Relations

```
users
├── manager_id → users.id (self-reference)
├── manager (relation) → User object
└── subordinates (relation) → Array of User objects

Example:
User A (id=1, manager_id=2)
  ├── manager → User B (id=2)
  └── subordinates → []

User B (id=2, manager_id=null)
  ├── manager → null
  └── subordinates → [User A]
```

---

## 🔒 Security

- Self-reference prevented in UI (cannot select self as manager)
- Circular reference possible (A → B → A) - Consider adding validation
- `onDelete: SetNull` - If manager deleted, subordinates' manager_id set to null

---

## 💡 Future Enhancements

1. **Prevent Circular Reference**
   - Add validation to prevent A → B → A
   - Check entire chain before saving

2. **Manager Hierarchy View**
   - Show org chart
   - Visualize reporting structure

3. **Bulk Manager Assignment**
   - Assign manager to multiple users at once

4. **Manager Change History**
   - Track when manager changes
   - Audit log for manager assignments

5. **Auto-assign Manager**
   - Based on department
   - Based on role

---

## ✅ Acceptance Criteria

- [x] Database schema updated with manager_id
- [x] Backend service handles manager_id
- [x] Frontend UI has manager dropdown
- [x] Can create user with manager
- [x] Can edit user's manager
- [x] Manager dropdown excludes current user
- [x] No TypeScript errors
- [x] No database errors

---

## 📊 Stats

- Files modified: 3
- Lines of code: ~50
- Time: ~15 minutes
- Complexity: Low

---

## 🎉 Summary

**Manager field successfully added!** ✅

Users can now:
- Select their direct manager
- Use "Quản lý trực tiếp" in workflows
- Build reporting hierarchy

**Ready for**: Workflow testing with manager approver type

---

**Next Steps**: Test workflow with manager approver in real scenario
