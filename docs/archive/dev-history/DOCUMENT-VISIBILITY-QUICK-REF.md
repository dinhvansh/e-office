# Document Visibility - Quick Reference

**Status**: ✅ Implemented (2025-11-20)  
**Phase**: 1 - Foundation

---

## 🔒 Access Control Matrix

| User Role | Document Owner | Visibility | Confidential Level | Can View? |
|-----------|----------------|------------|-------------------|-----------|
| **Admin** | Any | Any | Any | ✅ Always |
| **Owner** | Self | Any | Any | ✅ Always |
| User | Other | Public | Normal | ✅ Yes |
| User | Other | Public | Confidential | ✅ Yes |
| User | Other | Public | Secret | ❌ No (403) |
| User | Other | Private | Any | ❌ No (403) |
| User | Other | Department | Any | ❌ No (not implemented) |

---

## 📋 Field Values

### Confidential Level
- `normal` - Default, no restrictions
- `confidential` - Label only (same as normal for now)
- `secret` - Only owner + admin can see

### Visibility Scope
- `public` - Everyone in tenant (if not secret)
- `department` - Same department only (TODO: needs department_id)
- `private` - Only owner + admin

---

## 🎯 Quick Test

```bash
# 1. Create public normal doc (everyone sees)
POST /documents
{
  "confidential_level": "normal",
  "visibility_scope": "public"
}

# 2. Create secret private doc (owner + admin only)
POST /documents
{
  "confidential_level": "secret",
  "visibility_scope": "private"
}

# 3. List as regular user (should only see #1)
GET /documents

# 4. Try to access #2 as regular user (should get 403)
GET /documents/2
```

---

## 🔧 Implementation Files

**Backend**:
- `documents.access.ts` - Permission logic
- `documents.service.ts` - Filter by user
- `documents.controller.ts` - Pass userId

**Frontend**:
- `documents/page.tsx` - UI dropdowns

**Test**:
- `test-document-visibility.http` - 12 test cases

---

## 💡 Key Points

1. **Admin bypass** - Admins see everything
2. **Owner access** - Owners always see their docs
3. **Secret overrides** - Secret level overrides public scope
4. **Tenant isolation** - Always enforced first
5. **Department TODO** - Needs department_id on documents

---

## 🚀 Usage in Code

```typescript
// Check if user can view document
import { canViewDocument } from './documents.access';

const canView = await canViewDocument(user, document);
if (!canView) {
  throw ApiError.forbidden("Access denied", "DOCUMENT_ACCESS_DENIED");
}

// Filter documents array
import { filterViewableDocuments } from './documents.access';

const viewableDocs = await filterViewableDocuments(user, allDocuments);
```

---

**Last Updated**: 2025-11-20  
**See Also**: `TASK-DOCUMENT-VISIBILITY-COMPLETE.md`
