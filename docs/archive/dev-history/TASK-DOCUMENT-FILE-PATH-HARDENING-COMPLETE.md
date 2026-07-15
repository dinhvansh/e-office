# TASK COMPLETE: Bảo mật `file_path` & endpoint download tài liệu

**Owner dev chính**: Kiro (DEV1)  
**Người thiết kế**: Senior Software Architect (GPT)  
**Trạng thái**: ✅ COMPLETE (2025-11-21)  
**Phase**: 1 (Security hardening)  
**Duration**: ~1 hour

---

## 📋 Summary

Successfully implemented security hardening for document file paths:

1. ✅ **Hidden `file_path`** from all API responses
2. ✅ **Added `original_file_name`** for display
3. ✅ **Validated `storage_path`** to prevent LFR attacks
4. ✅ **Download endpoint** already secured (from previous session)

---

## ✅ Acceptance Criteria Status

### Backend ✅

- [x] API `GET /documents` does NOT expose `file_path`
- [x] API `GET /documents/:id` does NOT expose `file_path`
- [x] Field `original_file_name` present in all responses
- [x] Endpoint `GET /documents/:id/download` secured with permission check
- [x] Upload via `storage_path`:
  - [x] Rejects paths with `..` or `~` (path traversal)
  - [x] Rejects paths outside `STORAGE_BASE_PATH`
  - [x] Returns 400 with code `INVALID_STORAGE_PATH`

### Frontend ✅

- [x] `/documents` page does NOT use `file_path.split("/")`
- [x] Display name uses `original_file_name || title || "Document #id"`
- [x] Download button uses `original_file_name` for filename

---

## 🔧 Implementation Details

### 1. Database Schema

**Added field**:
```prisma
model documents {
  // ...
  original_file_name String?
  // ...
}
```

**Migration**: `npx prisma db push` (2025-11-21)

### 2. Backend Changes

**Files Modified**:
- `backend/prisma/schema.prisma` - Added `original_file_name` field
- `backend/src/modules/documents/documents.repository.ts` - Updated `CreateDocumentData` interface
- `backend/src/modules/documents/documents.service.ts` - Added storage path validation
- `backend/src/modules/documents/documents.controller.ts` - Applied DTO mapping

**Files Created**:
- `backend/src/modules/documents/documents.dto.ts` - Response DTO (excludes `file_path`)

**Key Security Features**:

```typescript
// Storage path validation
if (storagePath.includes('..') || storagePath.includes('~')) {
  throw ApiError.badRequest("Invalid storage path: path traversal detected", "INVALID_STORAGE_PATH");
}

const resolvedPath = path.resolve(process.cwd(), storagePath);
const allowedBasePath = path.resolve(process.cwd(), env.STORAGE_BASE_PATH);

if (!resolvedPath.startsWith(allowedBasePath)) {
  throw ApiError.badRequest("Invalid storage path: must be within storage directory", "INVALID_STORAGE_PATH");
}
```

**DTO Mapping**:
```typescript
export function toDocumentDTO(doc: documents): DocumentResponseDTO {
  return {
    id: doc.id,
    // ... other fields
    original_file_name: doc.original_file_name,
    // file_path is NOT included
  };
}
```

### 3. Frontend Changes

**Files Modified**:
- `frontend/lib/types.ts` - Updated `DocumentRecord` type
- `frontend/app/(dashboard)/documents/page.tsx` - Updated display logic

**Before**:
```typescript
{doc.file_path.split("/").pop()}
```

**After**:
```typescript
{doc.original_file_name || doc.title || `Document #${doc.id}`}
```

---

## 🧪 Testing

### Automated Tests

**Script**: `backend/scripts/test-file-path-security.js`

**Test Scenarios**:
1. ✅ file_path not in upload response
2. ✅ file_path not in list response
3. ✅ file_path not in detail response
4. ✅ Path traversal attacks blocked (4 patterns)
5. ✅ Outside storage paths blocked (3 patterns)

**Results**: All tests passing ✅

### Manual Test Cases

**Added to `test-api.http`**:
- Test #16: Verify file_path not exposed in list
- Test #17: Path traversal attack (should be blocked)
- Test #18: Outside storage path (should be blocked)

---

## 🔒 Security Improvements

### Vulnerabilities Fixed

1. **Information Disclosure** (Low severity)
   - **Before**: `file_path` exposed internal storage structure
   - **After**: Only `original_file_name` exposed

2. **Local File Read (LFR)** (High severity)
   - **Before**: `storage_path` could read arbitrary files
   - **After**: Strict validation prevents path traversal

### Attack Vectors Blocked

- `../../../etc/passwd` ❌ Blocked
- `..\\..\\..\\windows\\system32\\config\\sam` ❌ Blocked
- `~/sensitive-file.txt` ❌ Blocked
- `storage/../../../etc/passwd` ❌ Blocked
- `/tmp/malicious.pdf` ❌ Blocked
- `<absolute-path>\\malicious.pdf` ❌ Blocked

---

## 📊 Statistics

- **Database fields added**: 1
- **Backend files modified**: 4
- **Backend files created**: 1
- **Frontend files modified**: 2
- **Test scripts created**: 1
- **Test cases added**: 3
- **Lines of code**: ~300
- **Security vulnerabilities fixed**: 2
- **Time spent**: ~1 hour

---

## 🎯 Impact

### Security
- ✅ Reduced attack surface
- ✅ Prevented information disclosure
- ✅ Mitigated LFR vulnerability
- ✅ Hardened file upload endpoint

### User Experience
- ✅ Better file name display
- ✅ No change to existing workflows
- ✅ Backward compatible

### Code Quality
- ✅ Clean separation (DTO layer)
- ✅ Comprehensive validation
- ✅ Well-tested

---

## 🔜 Future Enhancements

1. **Optional**: Add `ALLOW_STORAGE_PATH_UPLOAD` env flag to completely disable `storage_path` for production
2. **Optional**: Add file type validation (MIME type check)
3. **Optional**: Add file size limits per document type
4. **Optional**: Implement virus scanning integration

---

## 📝 Notes for Reviewers

- ✅ All acceptance criteria met
- ✅ No breaking changes to existing API
- ✅ Backward compatible (old documents without `original_file_name` fallback to `title`)
- ✅ All tests passing
- ✅ No TypeScript errors
- ✅ Security best practices followed

---

**Task Status**: ✅ COMPLETE  
**Completion Date**: 2025-11-21  
**Next Task**: Ready for Phase 2 features
