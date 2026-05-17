# Authorization Model

This document describes the E-Office access-control model after the permission hardening work.

The goal is product-grade authorization for a tenant-based document workflow system. Route-level RBAC is still used, but document access is now also checked at resource level through the authorization engine.

## 1. Core Principles

- Tenant isolation is mandatory. A user can only access resources in `req.auth.tenantId`.
- Module RBAC answers: "Can this user generally perform this action?"
- Resource policy answers: "Can this user perform this action on this specific document?"
- Explicit deny wins over explicit allow.
- Owner/admin/participant access is evaluated before broad visibility rules.
- Document status can restrict mutations even when RBAC allows the module action.
- Authorization decisions should be auditable.

## 2. Decision Order

The current decision flow is implemented in `backend/src/modules/authorization/authorization.service.ts`.

1. Tenant isolation
2. Module RBAC permission
3. Explicit document ACL deny/allow
4. Confidential-level policy
5. Document type policy
6. Status-based restrictions
7. Resource-level allow policy
8. Audit decision logging

## 3. Tenant Isolation

Every document lookup is scoped by:

```ts
{ id: documentId, tenant_id: tenantId }
```

If the document is not in the caller tenant, the request is denied as if the document is unavailable.

Cross-tenant regression is covered by:

```bash
cd backend
npm run test:auth-matrix
```

## 4. Module RBAC

RBAC uses:

- `roles`
- `permissions`
- `user_roles`
- `role_permissions`

Examples:

```text
documents:read
documents:create
documents:update
documents:delete
departments:update
document_types:create
audit_logs:read
```

Route-level middleware:

```ts
requirePermission("documents", "read")
```

This is necessary but not sufficient for document-specific access.

## 5. Resource-Level Document Access

Use:

```ts
authorizationService.canAccessDocument(userId, tenantId, documentId, action)
```

Supported document actions:

```text
read
edit
approve
share
delete
```

Shared route middleware:

```ts
requireDocumentAccess("read")
requireDocumentAccess("edit")
requireDocumentAccess("share")
requireDocumentAccess("delete")
```

The middleware is in:

```text
backend/src/middleware/document-access.ts
```

## 6. Explicit Document ACL

Document-level grants are stored in `document_permissions`.

Supported subject types:

```text
user
role
department
position
```

Supported flags:

```text
can_read
can_edit
can_approve
can_share
can_delete
```

Policy behavior:

- `false` is treated as explicit deny.
- `true` is treated as explicit allow.
- If both exist through different subject matches, deny wins.

Example:

```json
{
  "subject_type": "department",
  "subject_id": 12,
  "can_read": true,
  "can_edit": false,
  "can_approve": false,
  "can_share": false,
  "can_delete": false
}
```

## 7. Visibility Rules

`documents.visibility_scope` controls broad read visibility.

Current values:

```text
public
department
private
```

Behavior:

- `private`: owner, admin, explicit allow, or workflow participant only.
- `department`: same department only, unless owner/admin/participant/explicit allow.
- `public`: readable by users with `documents:read`, subject to confidential policy.

## 8. Confidential-Level Policy

`documents.confidential_level` is evaluated against `positions.level`.

Current baseline mapping:

```text
normal       -> allowed by resource policy
confidential -> position.level >= 2
secret       -> position.level >= 4
top_secret   -> position.level >= 6
```

Owner and `super_admin` bypass confidential-level restrictions.

## 9. Document Type Policy

Document type policies are stored in `tenant_settings` with key:

```text
doc_type_policy:{documentTypeId}
```

API:

```http
GET    /api/v1/settings/document-type-policy/:documentTypeId
POST   /api/v1/settings/document-type-policy/:documentTypeId
DELETE /api/v1/settings/document-type-policy/:documentTypeId
```

Required permission:

```text
settings:manage
```

Example policy:

```json
{
  "allow_roles": ["Admin", "Manager"],
  "deny_roles": ["Viewer"],
  "allow_departments": [1, 2],
  "deny_departments": [5],
  "min_position_level": 3
}
```

Policy behavior:

- `deny_roles` blocks matched roles.
- `deny_departments` blocks matched departments.
- `min_position_level` blocks users below the configured rank.
- `allow_roles` restricts access to listed roles when present.
- `allow_departments` restricts access to listed departments when present.

## 10. Workflow Participant Access

A user is considered a document participant if they are:

- assigned approver in `document_approvals`
- internal signer in `signers`
- matching signer email in `signers`
- CC recipient in `document_cc_emails`

Participants can read the document if RBAC allows `documents:read`.

Mutations still require the relevant resource action.

## 11. Status-Based Restrictions

Mutating document actions are restricted by document status.

Current protected statuses:

```text
completed
archived
```

For `edit`, `delete`, and `share`, non-owner/non-super-admin users are denied when the document is completed or archived.

Service-level rules can be stricter. For example, delete still only allows draft/cancelled in `documentsService.deleteDocument`.

## 12. Sign Request and Field Editing

Sign request mutation now checks document-level edit access.

Protected operations include:

- add signer
- update signer
- remove signer
- reorder signer
- send request
- cancel request
- delete request
- revoke request
- open editor
- save fields
- delete field

These checks live in:

```text
backend/src/modules/signRequests/signRequests.service.ts
backend/src/modules/signRequests/signRequestFields.service.ts
```

## 13. Audit-Ready Decisions

Resource middleware records authorization decisions as audit events:

```text
authz.document.{action}.allow
authz.document.{action}.deny
```

Decision details are stored in `audit_logs.ua` as JSON:

```json
{
  "reasons": ["RBAC_OK", "CONFIDENTIAL_POLICY_OK", "RESOURCE_POLICY_ALLOW"],
  "deniedBy": null
}
```

Report API:

```http
GET /api/v1/audit/authz/decisions?user_id=&document_id=&action=&limit=
```

Required permission:

```text
audit_logs:read
```

## 14. Developer Checklist

When adding a new document-related route:

- Add module RBAC middleware first.
- Add `requireDocumentAccess(...)` for routes with `:id`.
- Use service-level checks for business rules such as status transitions.
- Scope every Prisma query by `tenant_id` or by a tenant-scoped parent.
- Emit audit events for state changes.
- Add a regression case to `backend/scripts/test-authorization-matrix.js` for high-risk routes.

## 15. Current Gaps

- Team/group policy is not modeled as a first-class table yet.
- Document type policy is stored in `tenant_settings` to avoid migration friction.
- Audit decision details currently use `audit_logs.ua`; a dedicated JSON column would be cleaner in a future migration.
- Some legacy routes still return mixed error envelope formats.

## 16. Verification

Run:

```bash
cd backend
npm run build
npm run test:auth-matrix
```

The matrix includes:

- role-based allow/deny
- department CRUD protection
- document type protection
- position update protection
- cross-tenant document denial
