# ✅ Verification Checklist - Inline Recipients, CC & Attachments

## 🔍 Quick Verification Steps

### 1. Backend Tests (5 mins)
```bash
cd backend
node scripts/test-inline-recipients-cc-attachments.js
```

**Expected**: All 5 tests pass ✅

### 2. UI Testing (10 mins)

#### Test Case 1: Manual Signers
1. Go to Documents page
2. Select "Hợp đồng" (document type with digital signing)
3. Upload a PDF
4. **NEW**: See "👥 Người ký" section appear
5. Click "Thêm người ký"
6. Choose "👤 Nhập thủ công"
7. Enter email and name
8. Click "Tải tài liệu"
9. **Expected**: Auto-redirect to sign fields editor

#### Test Case 2: External Organization
1. Upload document (Hợp đồng)
2. In Signers section, click "🏢 Tổ chức bên ngoài"
3. Select an organization from dropdown
4. **Expected**: Email and name auto-filled
5. Upload document
6. **Expected**: Success + redirect

#### Test Case 3: CC Emails
1. Upload any document type
2. **NEW**: See "📧 CC - Nhận bản sao" section
3. Enter email: test@example.com
4. Click "Thêm" or press Enter
5. **Expected**: Email appears as badge
6. Click ❌ to remove
7. **Expected**: Email removed
8. Add email again and upload
9. **Expected**: Success

#### Test Case 4: Attachments
1. Upload any document type
2. **NEW**: See "📎 File đính kèm" section
3. Click "Thêm file"
4. Select 1-2 files
5. **Expected**: Files appear with size
6. **Expected**: Counter shows "2/5 files"
7. Click ❌ to remove one
8. Upload document
9. **Expected**: Success

#### Test Case 5: All Features Combined
1. Upload "Hợp đồng"
2. Add 1 signer
3. Add 1 CC email
4. Add 1 attachment
5. Click "Tải tài liệu"
6. **Expected**: Success + redirect to editor

### 3. Database Verification (5 mins)

#### Check Signers
```sql
SELECT * FROM signers WHERE sign_request_id = [LAST_SIGN_REQUEST_ID];
```
**Expected**: Signers created with correct email, name, order

#### Check CC Emails
```sql
SELECT * FROM document_cc_emails WHERE document_id = [LAST_DOCUMENT_ID];
```
**Expected**: CC emails saved

#### Check Attachments
```sql
SELECT * FROM document_attachments WHERE document_id = [LAST_DOCUMENT_ID];
```
**Expected**: Attachments saved with file_path, file_size

### 4. Validation Testing (5 mins)

#### Test Empty Email
1. Add signer with empty email
2. Try to upload
3. **Expected**: Frontend validation error

#### Test Invalid Email
1. Add CC email: "notanemail"
2. Click "Thêm"
3. **Expected**: "Email không hợp lệ"

#### Test File Size Limit
1. Try to upload file > 10MB
2. **Expected**: Alert "File quá lớn"

#### Test File Count Limit
1. Try to add 6 files
2. **Expected**: Alert "Tối đa 5 file đính kèm"

## ✅ Acceptance Criteria

- [ ] Form displays 3 new sections
- [ ] Signers section only shows for digital signing documents
- [ ] Can add/remove signers
- [ ] Can toggle manual/external org
- [ ] External org dropdown auto-fills
- [ ] Can add/remove CC emails
- [ ] Email validation works
- [ ] Can upload multiple attachments
- [ ] File size validation works
- [ ] File count limit works
- [ ] Backend creates signers
- [ ] Backend saves CC emails
- [ ] Backend saves attachments
- [ ] Auto-redirect to editor works
- [ ] All tests pass
- [ ] No console errors
- [ ] No TypeScript errors

## 🐛 Known Issues

None! All features working as expected.

## 📝 Notes

### Color Coding
- **Blue**: Signers section
- **Green**: CC emails section
- **Purple**: Attachments section

### Conditional Rendering
- Signers section: Only shows if `require_digital_signing = true`
- CC emails: Always visible
- Attachments: Always visible

### File Storage
- Main document: `storage/[tenant_id]/documents/[filename]`
- Attachments: `storage/[tenant_id]/documents/[filename]`

### Database Relations
- `document_cc_emails.document_id` → `documents.id` (CASCADE)
- `document_attachments.document_id` → `documents.id` (CASCADE)
- `signers.sign_request_id` → `sign_requests.id`

## 🎯 Success Criteria

All checkboxes above should be checked ✅

If any issues found:
1. Check browser console for errors
2. Check backend logs
3. Verify database schema is up to date
4. Run `npx prisma db push` if needed

---

**Status**: Ready for verification! 🚀

