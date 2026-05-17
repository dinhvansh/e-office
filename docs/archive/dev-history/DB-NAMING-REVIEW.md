# Database Naming Review

**Date:** 2025-11-28  
**Purpose:** Review database schema for naming inconsistencies

---

## 🔴 Critical Issues (Cần sửa ngay)

### 1. `document_approvals.action` vs Expected `status`

**Current:**
```prisma
model document_approvals {
  action  String  @default("pending")  // 'pending', 'approved', 'rejected'
}
```

**Issue:** 
- Field tên `action` nhưng chứa trạng thái (status)
- Gây nhầm lẫn: "action" thường là hành động (verb), không phải trạng thái (state)
- Frontend expect `status`, phải map `action` → `status`

**Recommendation:**
```prisma
model document_approvals {
  status  String  @default("pending")  // 'pending', 'approved', 'rejected'
}
```

**Impact:** 
- 🔴 HIGH - Gây confusion trong code
- Cần migration để đổi tên column
- Cần update tất cả code references

---

### 2. `document_approvals.comment` vs Expected `comments` (plural)

**Current:**
```prisma
model document_approvals {
  comment  String?  // Singular
}
```

**Issue:**
- Singular `comment` nhưng có thể có nhiều comments
- Frontend convention thường dùng plural `comments`
- Phải map `comment` → `comments`

**Recommendation:**
```prisma
model document_approvals {
  comments  String?  // Plural, hoặc giữ singular nếu chỉ 1 comment
}
```

**Impact:**
- 🟡 MEDIUM - Gây nhầm lẫn nhỏ
- Nếu giữ singular, nên đổi tên table thành `document_approval` (singular)

---

### 3. `document_approvals.acted_at` vs Expected `approved_at/rejected_at`

**Current:**
```prisma
model document_approvals {
  acted_at  DateTime?  // Generic timestamp
}
```

**Issue:**
- `acted_at` quá generic, không rõ là approved hay rejected
- Frontend expect `approved_at` và `rejected_at` riêng biệt
- Phải check `action` để biết `acted_at` là gì

**Recommendation:**
```prisma
model document_approvals {
  approved_at  DateTime?
  rejected_at  DateTime?
  // Hoặc giữ acted_at nhưng thêm helper fields
}
```

**Impact:**
- 🟡 MEDIUM - Cần logic phức tạp để map
- Có thể giữ `acted_at` nếu thêm computed fields

---

## 🟡 Medium Issues (Nên sửa)

### 4. Table name: `document_approvals` (plural) vs `approval` (singular)

**Current:** `document_approvals` (plural)

**Convention:**
- Prisma/TypeScript: Singular (`document_approval`)
- Rails/Laravel: Plural (`document_approvals`)

**Recommendation:**
- Nếu follow Prisma convention: Đổi thành `document_approval`
- Nếu follow Rails convention: Giữ nguyên `document_approvals`

**Current codebase:** Mixed (có cả singular và plural)

**Impact:**
- 🟡 MEDIUM - Consistency issue
- Không ảnh hưởng functionality

---

### 5. `signers.file_size` field type

**Current:**
```prisma
model document_attachments {
  file_size  BigInt?  // ✅ Correct
}
```

**But:**
```prisma
model documents {
  file_size  Int?  // ⚠️ Should be BigInt for large files
}
```

**Issue:** Files > 2GB sẽ overflow Int

**Recommendation:**
```prisma
model documents {
  file_size  BigInt?  // Support files > 2GB
}
```

**Impact:**
- 🟢 LOW - Chỉ ảnh hưởng files rất lớn
- Easy fix, low risk

---

## 🟢 Minor Issues (Nice to have)

### 6. Inconsistent naming: `mime_type` vs `file_type`

**Current:**
```prisma
model documents {
  mime_type  String?  // ✅ Standard term
}

model document_attachments {
  file_type  String?  // ⚠️ Should be mime_type
}
```

**Recommendation:** Unify to `mime_type` (industry standard)

---

### 7. Missing `updated_at` timestamps

**Current:** Most tables only have `created_at`

**Recommendation:** Add `updated_at` for audit trail
```prisma
model documents {
  created_at  DateTime  @default(now())
  updated_at  DateTime  @updatedAt  // ← Add this
}
```

**Impact:**
- 🟢 LOW - Nice to have for tracking changes
- Not critical for current features

---

## 📊 Summary Table

| Issue | Severity | Table | Field | Current | Recommended | Impact |
|-------|----------|-------|-------|---------|-------------|--------|
| 1 | 🔴 HIGH | document_approvals | action | action | status | Confusion, mapping required |
| 2 | 🟡 MEDIUM | document_approvals | comment | comment | comments | Minor confusion |
| 3 | 🟡 MEDIUM | document_approvals | acted_at | acted_at | approved_at/rejected_at | Complex mapping |
| 4 | 🟡 MEDIUM | - | document_approvals | plural | singular? | Consistency |
| 5 | 🟢 LOW | documents | file_size | Int | BigInt | Large file support |
| 6 | 🟢 LOW | document_attachments | file_type | file_type | mime_type | Consistency |
| 7 | 🟢 LOW | All tables | - | - | updated_at | Audit trail |

---

## 🎯 Recommended Action Plan

### Phase 1: Critical Fixes (Do first)

1. **Rename `action` → `status`** in `document_approvals`
   ```sql
   ALTER TABLE document_approvals RENAME COLUMN action TO status;
   ```

2. **Update all code references**
   - Backend: Search for `approval.action` → `approval.status`
   - Frontend: Remove mapping logic

### Phase 2: Medium Fixes (Do when convenient)

3. **Rename `comment` → `comments`** (or keep singular if only 1 comment)
4. **Add `approved_at` and `rejected_at`** fields
5. **Change `file_size` to BigInt** in documents table

### Phase 3: Nice to Have (Optional)

6. **Unify `file_type` → `mime_type`**
7. **Add `updated_at` timestamps**
8. **Consider singular table names** for consistency

---

## 🔧 Migration Script Template

```sql
-- Phase 1: Critical
ALTER TABLE document_approvals RENAME COLUMN action TO status;
ALTER TABLE document_approvals RENAME COLUMN comment TO comments;

-- Phase 2: Medium
ALTER TABLE document_approvals ADD COLUMN approved_at TIMESTAMP;
ALTER TABLE document_approvals ADD COLUMN rejected_at TIMESTAMP;
ALTER TABLE documents ALTER COLUMN file_size TYPE BIGINT;

-- Phase 3: Optional
ALTER TABLE document_attachments RENAME COLUMN file_type TO mime_type;
ALTER TABLE documents ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
-- Add updated_at to other tables...
```

---

## 📝 Current Workaround

**For approval history feature:**

Frontend maps fields:
```typescript
approvals={data.document_approvals?.map(a => ({
  id: a.id,
  status: a.action,           // Map action → status
  comments: a.comment,        // Map comment → comments
  approved_at: a.action === 'approved' ? a.acted_at : null,
  rejected_at: a.action === 'rejected' ? a.acted_at : null,
  approver: a.approver
}))}
```

**This works but adds complexity and confusion.**

---

## 🎓 Naming Best Practices

### General Rules

1. **Be consistent:** Pick singular OR plural, stick with it
2. **Be descriptive:** `status` > `action`, `approved_at` > `acted_at`
3. **Follow conventions:** `mime_type` (standard), `created_at/updated_at` (Rails/Laravel)
4. **Avoid abbreviations:** `description` > `desc`, `comment` > `cmt`

### Prisma Conventions

- **Models:** Singular (`user`, `document`, `approval`)
- **Relations:** Plural (`users`, `documents`, `approvals`)
- **Timestamps:** `created_at`, `updated_at` (snake_case)
- **Booleans:** `is_active`, `has_permission` (prefix with is/has)

### Current Codebase

- ✅ Good: `created_at`, `is_active`, `tenant_id`
- ⚠️ Mixed: Some plural tables, some singular
- ❌ Bad: `action` for status, `comment` singular

---

## 🔗 Related Issues

- **TODO-APPROVAL-HISTORY-FEATURE.md** - Blocked by this naming issue
- **Session 2025-11-28** - Discovered during internal signing implementation

---

**Conclusion:** Database có một số naming issues, nhưng không critical. Có thể fix dần dần khi refactor. Hiện tại dùng mapping layer để workaround.
