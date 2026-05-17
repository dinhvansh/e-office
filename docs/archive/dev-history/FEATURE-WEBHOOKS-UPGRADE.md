# Webhooks Management - Feature Upgrade

**Date**: 2025-11-29  
**Status**: ✅ Complete

## Overview

Upgraded the webhooks page from a simple registration form to a full-featured webhook management system with CRUD operations, delivery logs, and modern UI.

## Changes Made

### 1. Database Schema

Added two new models to `backend/prisma/schema.prisma`:

**webhooks table**:
- `id` - Primary key
- `tenant_id` - Multi-tenant isolation
- `url` - Webhook endpoint URL
- `events` - Array of subscribed events
- `secret` - Optional secret for signature verification
- `active` - Enable/disable webhook
- `created_at`, `updated_at` - Timestamps

**webhook_logs table**:
- `id` - Primary key
- `webhook_id` - Foreign key to webhooks
- `event` - Event name that triggered the webhook
- `payload` - JSON payload sent
- `status_code` - HTTP response code
- `response` - Response body
- `error` - Error message if failed
- `sent_at` - Timestamp

### 2. Backend Implementation

**New Files**:
- `backend/src/modules/webhooks/webhooks.repository.ts` - Database operations

**Updated Files**:
- `backend/src/modules/webhooks/webhooks.routes.ts` - Added full CRUD routes
- `backend/src/modules/webhooks/webhooks.controller.ts` - Implemented all CRUD operations
- `backend/src/modules/webhooks/webhooks.service.ts` - Updated to use database and log deliveries

**API Endpoints**:
```
GET    /api/v1/webhooks          - List all webhooks
POST   /api/v1/webhooks          - Create webhook
GET    /api/v1/webhooks/:id      - Get webhook by ID
PUT    /api/v1/webhooks/:id      - Update webhook
DELETE /api/v1/webhooks/:id      - Delete webhook
GET    /api/v1/webhooks/:id/logs - Get delivery logs
POST   /api/v1/webhooks/register - Legacy endpoint (still works)
```

### 3. Frontend Implementation

**Updated**: `frontend/app/(dashboard)/webhooks/page.tsx`

**Features**:
- Modern table view with search functionality
- Add/Edit webhook dialog with form validation
- Active/Inactive status badges
- Event selection with checkboxes (9 available events)
- Secret key support for webhook authentication
- Enable/disable webhooks with switch
- Delete confirmation dialog
- Tabs for webhooks list and delivery logs (logs tab placeholder)
- Responsive design with Tailwind CSS
- Real-time updates with React Query

**UI Components Used**:
- Button, Input, Dialog, Badge, Tabs, Switch
- ConfirmDialog for delete confirmation
- Lucide icons (Plus, Search, Edit, Trash2, History, Webhook)
- Toast notifications (sonner)

### 4. Available Events

The system supports 9 webhook events:
1. `document.created` - Tài liệu được tạo
2. `document.updated` - Tài liệu được cập nhật
3. `document.deleted` - Tài liệu bị xóa
4. `approval.started` - Phê duyệt bắt đầu
5. `approval.completed` - Phê duyệt hoàn thành
6. `approval.rejected` - Phê duyệt bị từ chối
7. `sign.started` - Ký bắt đầu
8. `sign.completed` - Ký hoàn thành
9. `sign.declined` - Ký bị từ chối

### 5. Webhook Delivery

**Headers Sent**:
- `Content-Type: application/json`
- `X-Esign-Event: {event_name}`
- `X-Esign-Signature: {secret}` (if secret is configured)

**Payload Format**:
```json
{
  "event": "sign.completed",
  "payload": { /* event-specific data */ },
  "emitted_at": "2025-11-29T10:30:00.000Z"
}
```

**Logging**:
- All webhook deliveries are logged to `webhook_logs` table
- Includes status code, response, and error messages
- Accessible via API endpoint for debugging

## Testing

**Test Script**: `backend/scripts/test-webhooks.js`

Run with:
```bash
cd backend
node scripts/test-webhooks.js
```

Tests:
- ✅ Create webhook
- ✅ List webhooks
- ✅ Update webhook
- ✅ Get webhook logs
- ✅ Delete webhook

## Database Migration

Run to apply schema changes:
```bash
cd backend
npx prisma db push
npx prisma generate
```

## Usage Instructions

### For Administrators

1. Navigate to `/webhooks` in the dashboard
2. Click "Thêm Webhook" to create a new webhook
3. Enter the endpoint URL (e.g., `https://webhook.site/unique-id`)
4. Select events to subscribe to
5. Optionally add a secret key for authentication
6. Toggle active/inactive status
7. Save the webhook

### For Developers

**Triggering Webhooks**:
```typescript
import { webhookService } from "./modules/webhooks/webhooks.service";

// Emit a webhook event
await webhookService.emit(tenantId, "document.created", {
  document_id: 123,
  title: "New Document",
  created_by: "user@example.com"
});
```

**Current Integrations**:
- `sign.started` - Triggered in `signRequests.service.ts` when signing starts
- `sign.completed` - Triggered in `signers.service.ts` when all signers complete

## Future Enhancements

- [ ] Implement delivery logs tab with filtering
- [ ] Add retry mechanism for failed deliveries
- [ ] Webhook testing tool (send test payload)
- [ ] Webhook signature verification guide
- [ ] Rate limiting per webhook
- [ ] Webhook templates/presets
- [ ] Batch webhook operations
- [ ] Export webhook logs
- [ ] Webhook health monitoring dashboard

## Notes

- Webhooks are tenant-isolated (multi-tenant safe)
- Failed deliveries are logged but not retried automatically
- Inactive webhooks are not triggered
- Webhook logs are kept indefinitely (consider adding cleanup job)
- The Prisma client may need manual regeneration after schema changes

## Related Files

**Backend**:
- `backend/prisma/schema.prisma`
- `backend/src/modules/webhooks/webhooks.controller.ts`
- `backend/src/modules/webhooks/webhooks.service.ts`
- `backend/src/modules/webhooks/webhooks.repository.ts`
- `backend/src/modules/webhooks/webhooks.routes.ts`
- `backend/scripts/test-webhooks.js`

**Frontend**:
- `frontend/app/(dashboard)/webhooks/page.tsx`
- `frontend/constants/sidebarItems.ts` (navigation)

**Documentation**:
- `docs/api-spec.md` (API documentation)
