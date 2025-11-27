# TODO: Database Naming Fixes

**Priority:** Medium  
**Estimated Time:** 2-3 hours  
**Risk:** Medium (requires migration + code updates)

---

## Quick Checklist

### 🔴 Critical (Do first)

- [ ] **Rename `action` → `status`** in `document_approvals` table
  - Create migration
  - Update all backend code
  - Remove frontend mapping logic
  - Test approval workflow

- [ ] **Rename `comment` → `comments`** in `document_approvals` table
  - Create migration
  - Update all backend code
  - Remove frontend mapping logic

### 🟡 Medium (Do when convenient)

- [ ] **Add `approved_at` and `rejected_at`** to `document_approvals`
  - Keep `acted_at` for backward compatibility
  - Populate from `acted_at` based on `status`
  - Update frontend to use specific fields

- [ ] **Change `file_size` to BigInt** in `documents` table
  - For files > 2GB support
  - Low risk, easy migration

### 🟢 Low Priority (Nice to have)

- [ ] **Unify `file_type` → `mime_type`** in `document_attachments`
- [ ] **Add `updated_at`** timestamps to all tables
- [ ] **Consider singular table names** for consistency

---

## Migration Script

```sql
-- Critical fixes
ALTER TABLE document_approvals RENAME COLUMN action TO status;
ALTER TABLE document_approvals RENAME COLUMN comment TO comments;

-- Medium fixes
ALTER TABLE document_approvals ADD COLUMN approved_at TIMESTAMP;
ALTER TABLE document_approvals ADD COLUMN rejected_at TIMESTAMP;

-- Populate new fields from acted_at
UPDATE document_approvals 
SET approved_at = acted_at 
WHERE status = 'approved';

UPDATE document_approvals 
SET rejected_at = acted_at 
WHERE status = 'rejected';

-- Low priority
ALTER TABLE documents ALTER COLUMN file_size TYPE BIGINT;
ALTER TABLE document_attachments RENAME COLUMN file_type TO mime_type;
```

---

## Code Updates After Migration

### Backend

Search and replace:
- `approval.action` → `approval.status`
- `approval.comment` → `approval.comments`
- `a.acted_at` → `a.approved_at || a.rejected_at`

### Frontend

Remove mapping logic in:
- `frontend/app/(dashboard)/sign-requests/[id]/internal-sign/page.tsx`
- Any other places that map approval fields

---

## Testing Checklist

After migration:

- [ ] Approval workflow works
- [ ] Approval history displays correctly
- [ ] Status colors correct (green/red/yellow)
- [ ] Comments display
- [ ] Dates display correctly
- [ ] No 500 errors
- [ ] Internal signing page works
- [ ] External signing page works

---

See `docs/dev/DB-NAMING-REVIEW.md` for full analysis.
