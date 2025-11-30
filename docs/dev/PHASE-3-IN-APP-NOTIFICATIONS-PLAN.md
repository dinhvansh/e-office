# Phase 3: In-App Notifications Implementation Plan

**Date**: 2025-11-29  
**Status**: Planning  
**Estimated Duration**: 3-4 hours  
**Priority**: High

---

## 🎯 Objectives

Build a complete in-app notification system that:
1. Creates notifications for all key events (approvals, signing, workflow completion)
2. Displays notifications in a bell icon dropdown in the header
3. Marks notifications as read/unread
4. Links notifications to relevant pages
5. Shows unread count badge
6. Supports real-time updates (polling initially, WebSocket later)

---

## 📊 Current State

### ✅ What We Have
- `notifications` table in database schema with all required fields
- Email notification system fully implemented
- Event triggers in approval and signing services

### ❌ What We Need
- Backend notification module (repository, service, controller, routes)
- Frontend notification bell component
- Frontend notification dropdown UI
- Integration with existing event triggers
- Mark as read functionality
- Notification preferences (future)

---

## 🗂️ Database Schema (Already Exists)

```prisma
model notifications {
  id          Int       @id @default(autoincrement())
  tenant_id   Int
  user_id     Int
  type        String    @db.VarChar(50)
  title       String    @db.VarChar(255)
  message     String?
  link        String?   @db.VarChar(500)
  is_read     Boolean   @default(false)
  read_at     DateTime?
  created_at  DateTime  @default(now())

  tenant      tenants   @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  user        users     @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id, is_read, created_at])
  @@index([tenant_id])
}
```

---

## 🏗️ Implementation Tasks

### Task 1: Backend - Notification Module (1 hour)

**Files to Create**:
- `backend/src/modules/notifications/notifications.repository.ts`
- `backend/src/modules/notifications/notifications.service.ts`
- `backend/src/modules/notifications/notifications.controller.ts`
- `backend/src/modules/notifications/notifications.routes.ts`
- `backend/src/modules/notifications/notifications.types.ts`

**API Endpoints**:
```typescript
GET    /api/v1/notifications              // List user's notifications (paginated)
GET    /api/v1/notifications/unread-count // Get unread count
PATCH  /api/v1/notifications/:id/read     // Mark single as read
PATCH  /api/v1/notifications/read-all     // Mark all as read
DELETE /api/v1/notifications/:id          // Delete single notification
```

**Repository Methods**:
- `findByUser(userId, tenantId, options)` - List with pagination
- `countUnread(userId, tenantId)` - Count unread
- `create(data)` - Create notification
- `markAsRead(id, userId, tenantId)` - Mark single as read
- `markAllAsRead(userId, tenantId)` - Mark all as read
- `delete(id, userId, tenantId)` - Delete notification

**Service Methods**:
- `getUserNotifications(userId, tenantId, page, limit)` - Get paginated list
- `getUnreadCount(userId, tenantId)` - Get unread count
- `createNotification(data)` - Create new notification
- `markAsRead(id, userId, tenantId)` - Mark as read
- `markAllAsRead(userId, tenantId)` - Mark all as read
- `deleteNotification(id, userId, tenantId)` - Delete notification

**Notification Types**:
```typescript
enum NotificationType {
  APPROVAL_REQUEST = 'approval_request',
  APPROVAL_APPROVED = 'approval_approved',
  APPROVAL_REJECTED = 'approval_rejected',
  APPROVAL_INFO_REQUESTED = 'approval_info_requested',
  SIGN_REQUEST = 'sign_request',
  SIGN_COMPLETED = 'sign_completed',
  WORKFLOW_COMPLETED = 'workflow_completed',
  DOCUMENT_SHARED = 'document_shared',
  DOCUMENT_COMMENTED = 'document_commented',
}
```

---

### Task 2: Backend - Integration with Events (45 minutes)

**Files to Modify**:
- `backend/src/modules/approvals/approvals.service.ts`
- `backend/src/modules/signRequests/signRequests.service.ts`
- `backend/src/modules/public/publicSign.controller.ts`

**Integration Points**:

1. **Approval Request Created** (approvals.service.ts)
   - When: Document submitted for approval
   - Notify: All approvers in current step
   - Type: `approval_request`
   - Link: `/approvals?filter=pending`

2. **Approval Action Taken** (approvals.service.ts)
   - When: Approver approves/rejects/requests info
   - Notify: Document owner
   - Type: `approval_approved` | `approval_rejected` | `approval_info_requested`
   - Link: `/documents/{documentId}/flow`

3. **Workflow Completed** (approvals.service.ts)
   - When: All approvals completed
   - Notify: Document owner
   - Type: `workflow_completed`
   - Link: `/documents/{documentId}`

4. **Sign Request Sent** (signRequests.service.ts)
   - When: Sign request sent to signers
   - Notify: All signers (internal only)
   - Type: `sign_request`
   - Link: `/sign-requests/{signRequestId}/internal-sign`

5. **Sign Completed** (publicSign.controller.ts)
   - When: Signer completes signing
   - Notify: Document owner
   - Type: `sign_completed`
   - Link: `/documents/{documentId}`

---

### Task 3: Frontend - Notification Bell Component (1 hour)

**Files to Create**:
- `frontend/components/notifications/NotificationBell.tsx`
- `frontend/components/notifications/NotificationDropdown.tsx`
- `frontend/components/notifications/NotificationItem.tsx`
- `frontend/lib/notifications.ts` (API client)

**Component Structure**:

```tsx
// NotificationBell.tsx
- Bell icon with badge (unread count)
- Click to open dropdown
- Auto-refresh every 30 seconds
- Show loading state

// NotificationDropdown.tsx
- List of notifications (max 10)
- "Mark all as read" button
- "View all" link to full page
- Empty state
- Loading state

// NotificationItem.tsx
- Icon based on type
- Title and message
- Time ago (e.g., "2 minutes ago")
- Unread indicator (blue dot)
- Click to navigate and mark as read
- Delete button (hover)
```

**UI Design**:
- Bell icon in header (next to user menu)
- Badge with unread count (red, circular)
- Dropdown: 400px width, max 500px height
- Smooth animations
- Responsive design

---

### Task 4: Frontend - Integration with Layout (30 minutes)

**Files to Modify**:
- `frontend/app/(dashboard)/layout.tsx` - Add NotificationBell to header

**Changes**:
- Add NotificationBell component next to user menu
- Ensure proper spacing and alignment
- Mobile responsive

---

### Task 5: Frontend - Full Notifications Page (Optional, 30 minutes)

**Files to Create**:
- `frontend/app/(dashboard)/notifications/page.tsx`

**Features**:
- Full list of notifications (paginated)
- Filter by type
- Filter by read/unread
- Bulk actions (mark all as read, delete all)
- Search notifications

---

### Task 6: Testing (30 minutes)

**Test Scenarios**:
1. Create approval request → Check notification appears
2. Approve document → Check owner receives notification
3. Send sign request → Check signers receive notification
4. Complete signing → Check owner receives notification
5. Mark as read → Check badge updates
6. Mark all as read → Check all notifications marked
7. Delete notification → Check notification removed
8. Auto-refresh → Check new notifications appear

**Test Files to Create**:
- `backend/scripts/test-notifications.js`
- `backend/scripts/create-test-notifications.js`

---

## 📋 Implementation Checklist

### Backend
- [ ] Create notifications repository
- [ ] Create notifications service
- [ ] Create notifications controller
- [ ] Create notifications routes
- [ ] Add routes to v1 router
- [ ] Integrate with approvals service
- [ ] Integrate with sign requests service
- [ ] Integrate with public sign controller
- [ ] Test all endpoints

### Frontend
- [ ] Create NotificationBell component
- [ ] Create NotificationDropdown component
- [ ] Create NotificationItem component
- [ ] Create notifications API client
- [ ] Add NotificationBell to layout
- [ ] Test notification display
- [ ] Test mark as read
- [ ] Test delete notification
- [ ] Test auto-refresh

### Testing
- [ ] Create test script
- [ ] Test approval notifications
- [ ] Test signing notifications
- [ ] Test workflow completion notifications
- [ ] Test mark as read
- [ ] Test delete
- [ ] Test pagination
- [ ] Test unread count

### Documentation
- [ ] Update session log
- [ ] Create feature documentation
- [ ] Update README if needed

---

## 🎨 UI/UX Design

### Notification Bell
```
┌─────────────────────────────────────┐
│  [Logo]  E-Office    [🔔 3]  [User] │
└─────────────────────────────────────┘
```

### Notification Dropdown
```
┌─────────────────────────────────────┐
│ Notifications          Mark all read│
├─────────────────────────────────────┤
│ ● [📋] Approval Request             │
│   Document "Contract 2025" needs    │
│   your approval                     │
│   2 minutes ago                  [×]│
├─────────────────────────────────────┤
│   [✓] Approval Approved             │
│   Your document was approved        │
│   1 hour ago                     [×]│
├─────────────────────────────────────┤
│   [✍️] Sign Request                 │
│   Please sign "Agreement 2025"      │
│   3 hours ago                    [×]│
├─────────────────────────────────────┤
│           View all notifications    │
└─────────────────────────────────────┘
```

### Notification Types & Icons
- 📋 Approval Request (blue)
- ✅ Approval Approved (green)
- ❌ Approval Rejected (red)
- ℹ️ Info Requested (yellow)
- ✍️ Sign Request (purple)
- ✓ Sign Completed (green)
- 🎉 Workflow Completed (green)

---

## 🔄 Future Enhancements (Phase 4+)

1. **Real-time Updates**
   - WebSocket integration
   - Push notifications
   - No polling needed

2. **Notification Preferences**
   - User settings for notification types
   - Email vs in-app preferences
   - Frequency settings

3. **Notification Groups**
   - Group similar notifications
   - Collapse/expand groups
   - Batch actions

4. **Rich Notifications**
   - Inline actions (approve/reject from notification)
   - Preview content
   - Attachments

5. **Mobile App**
   - Push notifications
   - Native notification UI

---

## 📊 Success Metrics

- ✅ All notification types working
- ✅ Unread count accurate
- ✅ Mark as read working
- ✅ Delete working
- ✅ Auto-refresh working (30s interval)
- ✅ UI responsive and smooth
- ✅ No performance issues
- ✅ All tests passing

---

## 🚀 Next Steps After Phase 3

**Phase 4**: Advanced Search & Filters
- Full-text search
- Advanced filters
- Saved searches
- Search history

**Phase 5**: Dashboard & Analytics
- Document statistics
- Approval metrics
- User activity
- Charts and graphs

---

**Status**: Ready to implement  
**Estimated Time**: 3-4 hours  
**Priority**: High  
**Dependencies**: None (all prerequisites met)
