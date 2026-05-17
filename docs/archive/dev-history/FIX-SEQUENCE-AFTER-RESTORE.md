# Fix: Database Sequences After Restore

**Date**: 2025-11-22  
**Issue**: Unique constraint failed after restore  
**Status**: ✅ FIXED

---

## 🐛 Problem

### Error Message
```
Unique constraint failed on the fields: (`id`)
POST /api/v1/documents 500 (Internal Server Error)
```

### Root Cause

When restoring database from backup:
1. Records are inserted with their original IDs (e.g., documents 1-45)
2. PostgreSQL sequences are NOT automatically updated
3. Sequence still starts at 1
4. Next insert tries to use ID=1 → Conflict with existing record

**Example**:
```sql
-- After restore
SELECT MAX(id) FROM documents;  -- Returns 45
SELECT nextval('documents_id_seq');  -- Returns 1 ❌

-- Next insert
INSERT INTO documents ...  -- Tries to use ID=1 → ERROR!
```

---

## ✅ Solution

### Automatic Fix (Recommended)

The `restore-database-smart.js` script now **automatically fixes sequences** after restore:

```javascript
// Step 3: Fix sequences (added to restore script)
for (const table of RESTORE_ORDER) {
  const maxId = await getMaxId(table);
  if (maxId > 0) {
    await resetSequence(table, maxId);
  }
}
```

**Usage**:
```bash
cd backend
node scripts/restore-database-smart.js database-backup.json
```

**Output**:
```
🔧 Fixing database sequences...

   ✅ tenants                        → next ID: 2
   ✅ departments                    → next ID: 38
   ✅ users                          → next ID: 18
   ✅ documents                      → next ID: 42
   ...

✅ All sequences fixed and ready for new records!
```

### Manual Fix (If Needed)

If you restored using old script or need to fix manually:

```bash
cd backend
node scripts/fix-sequences.js
```

---

## 🔍 How It Works

### PostgreSQL Sequences

Each table with auto-increment ID has a sequence:
```sql
-- Sequence naming convention
{table_name}_id_seq

-- Examples
documents_id_seq
users_id_seq
departments_id_seq
```

### Reset Command

```sql
-- Get max ID
SELECT MAX(id) FROM documents;  -- Returns 45

-- Reset sequence to max_id
SELECT setval(pg_get_serial_sequence('documents', 'id'), 45, true);

-- Next insert will use ID=46 ✅
```

### Script Logic

```javascript
// 1. Get max ID from table
const result = await prisma.$queryRawUnsafe(
  `SELECT MAX(id) as max_id FROM ${table}`
);
const maxId = result[0]?.max_id || 0;

// 2. Reset sequence to max_id
if (maxId > 0) {
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('${table}', 'id'), ${maxId}, true)`
  );
}
```

---

## 📊 Tables Fixed

### Tables with ID Sequences (18 tables)
- ✅ tenants
- ✅ departments
- ✅ positions
- ✅ users
- ✅ permissions
- ✅ roles
- ✅ external_organizations
- ✅ workflows
- ✅ workflow_steps
- ✅ document_types
- ✅ numbering_rules
- ✅ documents
- ✅ workflow_instances
- ✅ document_approvals
- ✅ sign_requests
- ✅ signers
- ✅ sign_request_fields
- ✅ sign_request_field_values

### Junction Tables (No ID, Skipped)
- role_permissions (composite key)
- user_roles (composite key)

---

## 🧪 Testing

### Test Case 1: Upload Document After Restore

**Before Fix**:
```bash
# Upload document
POST /api/v1/documents
❌ Error: Unique constraint failed on id
```

**After Fix**:
```bash
# Upload document
POST /api/v1/documents
✅ Success: Document created with ID=46
```

### Test Case 2: Create User After Restore

**Before Fix**:
```bash
# Create user
POST /api/v1/users
❌ Error: Unique constraint failed on id
```

**After Fix**:
```bash
# Create user
POST /api/v1/users
✅ Success: User created with ID=18
```

---

## 📝 Best Practices

### 1. Always Use Smart Restore Script

```bash
# ✅ Good - Auto-fixes sequences
node scripts/restore-database-smart.js backup.json

# ❌ Bad - Old script, no sequence fix
node scripts/restore-database.js backup.json
```

### 2. Verify After Restore

```bash
# Check sequences are correct
node scripts/check-sequences.js
```

### 3. Manual Fix If Needed

```bash
# If you see "Unique constraint" errors
node scripts/fix-sequences.js
```

---

## 🔧 Scripts Available

### 1. restore-database-smart.js ⭐
**Full restore with auto-fix**
```bash
node scripts/restore-database-smart.js backup.json
```
- Clears data
- Restores in correct order
- Handles circular dependencies
- **Auto-fixes sequences** ✨

### 2. fix-sequences.js
**Manual sequence fix**
```bash
node scripts/fix-sequences.js
```
- Fixes all sequences
- Safe to run multiple times
- Use if restore was done manually

### 3. check-sequences.js (Future)
**Verify sequences**
```bash
node scripts/check-sequences.js
```
- Shows current vs expected sequence values
- Detects mismatches

---

## 💡 Why This Happens

### PostgreSQL Behavior

When you insert with explicit IDs:
```sql
INSERT INTO documents (id, title, ...) VALUES (1, 'Doc 1', ...);
INSERT INTO documents (id, title, ...) VALUES (2, 'Doc 2', ...);
```

PostgreSQL does NOT update the sequence automatically!

Sequence still thinks next value is 1:
```sql
SELECT nextval('documents_id_seq');  -- Returns 1 (wrong!)
```

### Solution

After inserting with explicit IDs, tell PostgreSQL the new sequence value:
```sql
SELECT setval('documents_id_seq', 45, true);
-- Now nextval() will return 46 ✅
```

---

## 🎯 Summary

**Problem**: Restore inserts records with IDs but doesn't update sequences  
**Impact**: Next insert fails with "Unique constraint" error  
**Solution**: Auto-fix sequences after restore  
**Status**: ✅ Fixed in restore-database-smart.js  

**Key Takeaway**: Always use `restore-database-smart.js` for restores!

---

## 📚 References

- PostgreSQL Sequences: https://www.postgresql.org/docs/current/functions-sequence.html
- Prisma Raw Queries: https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access

---

**Last Updated**: 2025-11-22  
**Status**: ✅ Implemented & Tested

