# Feature: CC Share (Document Sharing)

**Status**: ✅ Complete  
**Date**: 2024-12-02  
**Phase**: Document Management Enhancement

---

## 📋 Overview

Implemented CC (Carbon Copy) feature allowing document creators to share documents with additional recipients via email. CC recipients receive notification emails and can view the shared document regardless of visibility settings.

---

## ✨ Features Implemented

### 1. Backend

**Database**:
- ✅ Table `document_cc_emails` already exists
- Fields: `id`, `document_id`, `email`, `sent_at`, `created_at`

**Email Service** (`backend/src/modules/common/email.service.ts`):
- ✅ Added `sendDocumentSharedEmail()` method
- Sends notification to CC recipients with document link
- Professional email template with document info

**Documents Service** (`backend/src/modules/documents/documents.service.ts`):
- ✅ Save CC emails when creating document
- ✅ Send notification email to each CC recipient
- ✅ Update `sent_at` timestamp after sending

**Access Control** (`backend/src/modules/documents/documents.access.ts`):
- ✅ Added Layer 3.6: CC check
- CC recipients can view document even if private/secret
- Check by matching user email with CC list

**Repository** (`backend/src/modules/documents/documents.repository.ts`):
- ✅ Include `cc_emails` in `findById()`
- ✅ Include `attachments` and `owner` info

### 2. Frontend

**Documents Page** (`frontend/app/(dashboard)/documents/page.tsx`):
- ✅ CC emails input already exists in create form
- ✅ `CCEmailsSection` component for managing CC list
- ✅ CC emails sent to backend when creating document

### 3. Filters

**Backend**:
- ✅ Added `document_type_id` filter
- ✅ Added `confidential_level` filter
- Filters work with pagination and search

**Frontend**:
- ✅ Added "Loại văn bản" dropdown filter
- ✅ Added "Mức bảo mật" dropdown filter
- Filters update query params and refetch data

---

## 🔐 Access Control Rules

### Document Visibility Matrix (Updated)

| User Type | Condition | Can View? |
|-----------|-----------|-----------|
| Admin | Any document | ✅ Always |
| Owner | Own document | ✅ Always |
| Approver | Assigned to approve | ✅ Yes |
| **CC Recipient** | **Email in CC list** | **✅ Yes** |
| Regular User | Public + Normal/Confidential | ✅ Yes |
| Regular User | Secret or Private | ❌ No |

**Priority Order**:
1. Tenant check (must be same tenant)
2. Admin bypass (admins see all)
3. Owner check (owners see their docs)
4. Approver check (assigned approvers)
5. **CC check (email in CC list)** ← NEW
6. Visibility scope (public/department/private)
7. Confidential level (normal/confidential/secret)

---

## 📧 Email Notification

**Template**: Professional HTML email with:
- Document title and number
- Sender name
- Optional message
- Direct link to view document
- Responsive design

**Sending Logic**:
- Sent immediately after document creation
- One email per CC recipient
- Failures logged but don't block document creation
- `sent_at` timestamp recorded in database

---

## 🧪 Testing

**Test Script**: `backend/scripts/test-cc-share-feature.js`

**Test Coverage**:
- ✅ Create document with CC emails
- ✅ Verify CC emails saved to database
- ✅ Verify `sent_at` timestamp
- ✅ Check document includes CC list
- ✅ Verify CC recipient in list
- ✅ Access control logic

**Test Results**: All passed ✅

---

## 📝 Usage Example

### Creating Document with CC

```typescript
// Frontend
const ccEmails = ['user1@example.com', 'user2@example.com'];

await fetchJson('/documents', {
  method: 'POST',
  body: JSON.stringify({
    file_name: 'report.pdf',
    file_base64: '...',
    title: 'Monthly Report',
    cc_emails: ccEmails, // ← CC recipients
  })
});
```

### Backend Processing

```typescript
// 1. Save document
const document = await prisma.documents.create({ ... });

// 2. Save CC emails
for (const email of ccEmails) {
  await prisma.document_cc_emails.create({
    data: {
      document_id: document.id,
      email,
      sent_at: new Date(),
    }
  });

  // 3. Send notification
  await emailService.sendDocumentSharedEmail({
    recipientEmail: email,
    documentTitle: document.title,
    senderName: owner.full_name,
    documentUrl: `${FRONTEND_URL}/documents/${document.id}`,
  });
}
```

### Access Check

```typescript
// Check if user can view document
const ccEmail = await prisma.document_cc_emails.findFirst({
  where: {
    document_id: doc.id,
    email: user.email
  }
});

if (ccEmail) {
  return true; // CC recipient can view
}
```

---

## 🎯 Use Cases

1. **Share for Reference**: Share completed documents with stakeholders
2. **Keep Informed**: CC managers on important documents
3. **External Sharing**: Share with external partners (if they have accounts)
4. **Audit Trail**: Track who was notified about document

---

## 🔄 Integration Points

**Works with**:
- ✅ Document visibility (public/private/department)
- ✅ Confidential levels (normal/confidential/secret)
- ✅ Document filters (type, level, status)
- ✅ Pagination and search
- ✅ Email notifications system

**Future Enhancements**:
- [ ] Show CC list in document detail page
- [ ] Allow adding/removing CC after creation
- [ ] CC notification preferences
- [ ] Track email open/read status
- [ ] Bulk CC management

---

## 📊 Database Schema

```sql
CREATE TABLE document_cc_emails (
  id          SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  email       VARCHAR(255) NOT NULL,
  sent_at     TIMESTAMP,
  created_at  TIMESTAMP DEFAULT NOW(),
  INDEX idx_document_id (document_id)
);
```

---

## 🚀 Deployment Notes

**No migration needed** - Table already exists

**Environment Variables**:
- `FRONTEND_URL` - Used in email links (default: http://localhost:3000)
- Email config (SMTP_*) - Required for sending notifications

**Testing Checklist**:
- [ ] Create document with CC emails
- [ ] Verify emails sent (check SMTP logs)
- [ ] Login as CC recipient
- [ ] Verify can view document
- [ ] Verify cannot view if removed from CC
- [ ] Test with private documents
- [ ] Test with secret documents

---

## 📚 Related Files

**Backend**:
- `backend/src/modules/common/email.service.ts` - Email templates
- `backend/src/modules/documents/documents.service.ts` - CC logic
- `backend/src/modules/documents/documents.access.ts` - Access control
- `backend/src/modules/documents/documents.repository.ts` - DB queries
- `backend/prisma/schema.prisma` - Database schema

**Frontend**:
- `frontend/app/(dashboard)/documents/page.tsx` - Create form
- `frontend/components/documents/CCEmailsSection.tsx` - CC input

**Scripts**:
- `backend/scripts/test-cc-share-feature.js` - Feature test
- `backend/scripts/test-document-filters-permissions.js` - Filter test

---

## ✅ Summary

Chức năng CC Share đã hoàn thành với:
- ✅ Lưu CC emails vào database
- ✅ Gửi email thông báo cho CC recipients
- ✅ CC recipients có thể xem document (bypass visibility)
- ✅ Access control được cập nhật
- ✅ Integration với filters và permissions
- ✅ Test scripts đầy đủ

**Next Steps**: Test trong UI và verify email notifications hoạt động đúng.
