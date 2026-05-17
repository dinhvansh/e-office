# Testing Checklist: Document Types + Numbering Integration

**Task**: Integrate document_types + numbering into upload flow  
**Developer**: Kiro  
**Date**: 2025-11-19

---

## ✅ Implementation Checklist

### Backend
- [x] Extended `CreateDocumentData` interface with new fields
- [x] Added `generateNumberForDocument()` to numbering service
- [x] Implemented document type handling in `createDocument()`
- [x] Extended API schema to accept `document_type_id`
- [x] Error handling for missing type/rule
- [x] Backward compatibility maintained

### Frontend
- [x] Added `DocumentType` interface to shared types
- [x] Extended `DocumentRecord` with document_type_id and document_number
- [x] Added document type dropdown (required field)
- [x] Added "Số văn bản" column in documents table
- [x] Validation: prevent upload without type selection
- [x] Error messages displayed properly

### Testing
- [x] Added 5 test cases to test-api.http
- [x] Created test helper script
- [x] Documented testing instructions

---

## 🧪 Manual Testing Checklist

### Backend API Tests (use test-api.http)

#### Test 1: Backward Compatibility
- [ ] Upload document WITHOUT document_type_id
- [ ] Expected: Success, document_type_id = NULL, document_number = NULL
- [ ] Verify in database: `SELECT id, document_type_id, document_number FROM documents ORDER BY id DESC LIMIT 1;`

#### Test 2: Type Without Numbering
- [ ] Get document types: `GET /document-types`
- [ ] Find a type with `require_numbering = false` (e.g., "Hợp đồng" ID=8)
- [ ] Upload document WITH that document_type_id
- [ ] Expected: Success, document_type_id = 8, document_number = NULL
- [ ] Verify in database

#### Test 3: Type With Numbering (Has Rule)
- [ ] Find a type with `require_numbering = true` and has rule (e.g., "Quyết định" ID=1)
- [ ] Upload document WITH that document_type_id
- [ ] Expected: Success, document_type_id = 1, document_number = "001/2025/QD" (or similar)
- [ ] Verify numbering_rule_id is set
- [ ] Check numbering_rules table: last_number should increment
- [ ] Upload another document with same type
- [ ] Expected: document_number = "002/2025/QD"

#### Test 4: Type With Numbering (No Rule)
- [ ] Try to upload with document_type_id that requires numbering but has no rule
- [ ] Expected: 400 error with code "NUMBERING_RULE_NOT_CONFIGURED"

#### Test 5: Invalid Document Type
- [ ] Upload with document_type_id = 999 (non-existent)
- [ ] Expected: 404 error with code "DOCUMENT_TYPE_NOT_FOUND"

### Frontend UI Tests

#### Test 6: Document Type Dropdown
- [ ] Start frontend: `cd frontend && npm run dev`
- [ ] Login and navigate to `/documents`
- [ ] Verify dropdown "Loại văn bản" is visible
- [ ] Verify dropdown shows only active document types
- [ ] Verify dropdown shows format: "Name (CODE)"

#### Test 7: Upload Validation
- [ ] Try to upload without selecting document type
- [ ] Expected: Error message "Vui lòng chọn loại văn bản"
- [ ] API should NOT be called

#### Test 8: Upload With Type (No Numbering)
- [ ] Select document type that doesn't require numbering
- [ ] Upload a PDF file
- [ ] Expected: Success, document appears in table
- [ ] Verify "Số văn bản" column shows "—"

#### Test 9: Upload With Type (With Numbering)
- [ ] Select document type that requires numbering (e.g., "Quyết định")
- [ ] Upload a PDF file
- [ ] Expected: Success, document appears in table
- [ ] Verify "Số văn bản" column shows generated number (e.g., "001/2025/QD")
- [ ] Number should be in blue monospace font

#### Test 10: Multiple Uploads
- [ ] Upload 3 documents with same document type (requires numbering)
- [ ] Expected: Numbers increment: 001, 002, 003
- [ ] Verify in table all numbers are unique and sequential

#### Test 11: Document Types Page
- [ ] Navigate to `/document-types`
- [ ] Verify page still loads correctly
- [ ] Verify document types display with numbering rules

### Integration Tests

#### Test 12: Existing Tests Still Work
- [ ] Run `backend/scripts/test-basic-flow.ts` (if exists)
- [ ] Expected: Should still pass (or need minor update)

#### Test 13: Playwright E2E
- [ ] Run `npm run test:e2e` in frontend
- [ ] Expected: Tests pass or need minor update for new required field

---

## 🐛 Known Issues / Edge Cases

- [ ] Department code ({DEPT} token) not implemented yet - shows empty
- [ ] No UI for editing document metadata (title, summary, etc.)
- [ ] Document type dropdown doesn't show category/description

---

## 📊 Database Verification Queries

```sql
-- Check documents with types and numbers
SELECT 
  d.id,
  d.file_path,
  d.document_type_id,
  d.document_number,
  d.numbering_rule_id,
  dt.name as type_name,
  dt.code as type_code
FROM documents d
LEFT JOIN document_types dt ON d.document_type_id = dt.id
ORDER BY d.id DESC
LIMIT 10;

-- Check numbering rules last_number
SELECT 
  nr.id,
  nr.pattern,
  nr.last_number,
  nr.reset_yearly,
  dt.name as document_type
FROM numbering_rules nr
JOIN document_types dt ON nr.document_type_id = dt.id;

-- Count documents by type
SELECT 
  dt.name,
  dt.code,
  COUNT(d.id) as document_count
FROM document_types dt
LEFT JOIN documents d ON d.document_type_id = dt.id
GROUP BY dt.id, dt.name, dt.code
ORDER BY document_count DESC;
```

---

## 🐛 Bugs Found & Fixed

### Bug #1: Document types dropdown not loading (FIXED)
- **Issue**: `fetchJson` shape mismatch - used `{ data: DocumentType[] }` but API returns `DocumentType[]` directly
- **Fix**: Changed to `fetchJson<DocumentType[]>` and return `data` directly
- **Status**: ✅ Fixed

## ✅ Sign-off

- [ ] All backend tests passed
- [ ] All frontend tests passed
- [ ] Database queries verified
- [ ] Backward compatibility confirmed
- [ ] Documentation complete
- [ ] Ready for code review

**Tested by**: _____________  
**Date**: _____________  
**Notes**: 
- Automated tests require Playwright installation: `npx playwright install`
- Manual testing recommended using checklist above
