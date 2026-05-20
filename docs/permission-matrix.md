# Permission Matrix

Last updated: 2026-05-20

## Authorization levels

1. Tenant isolation: every protected resource is scoped by `tenant_id`.
2. Module RBAC: `resource:action` permissions checked by `requirePermission` or `requireAnyPermission`.
3. Resource-level document authorization:
   - explicit ACL (`document_permissions`)
   - owner / approver / signer / CC participation
   - visibility (`public`, `department`, `private`)
   - confidentiality rank (`normal`, `confidential`, `secret`, `top_secret`)
   - document type policy
   - document status restrictions
4. Sign request read/write inheritance:
   - `sign_requests:read` now also requires read access to the linked document
   - `sign_requests:update` now also requires edit access to the linked document
5. Approval ownership:
   - approval actions require `approvals:update`
   - approval detail routes also require the current user to be the assigned approver

## Normalized permission catalog

| Resource | Actions |
|---|---|
| `users` | `create`, `read`, `update`, `delete`, `manage_roles` |
| `departments` | `create`, `read`, `update`, `delete` |
| `positions` | `create`, `read`, `update`, `delete` |
| `documents` | `create`, `read`, `update`, `delete`, `share` |
| `document_types` | `create`, `read`, `update`, `delete` |
| `workflows` | `create`, `read`, `update`, `delete` |
| `approvals` | `read`, `update` |
| `sign_requests` | `create`, `read`, `update`, `delete` |
| `roles` | `create`, `read`, `update`, `delete` |
| `audit_logs` | `read`, `export` |
| `settings` | `read`, `update` |
| `external_orgs` | `create`, `read`, `update`, `delete` |
| `webhooks` | `create`, `read`, `update`, `delete` |

Legacy permissions removed from active catalog:

- `settings:manage`
- `approvals:create`
- `approvals:delete`
- `sign_requests:approve`

## Screen matrix

| Screen | Primary permission(s) | Notes |
|---|---|---|
| `/` dashboard | mixed read permissions | Each widget loads only if matching read permission exists |
| `/documents` | `documents:read` | Upload panel also needs `documents:create` |
| `/documents/:id` and downloads | `documents:read` + resource access | Resource-level document authorization enforced |
| `/documents/:id/flow` | `documents:read` + resource access | Route now protected by document access middleware |
| `/sign-requests` | `sign_requests:read` + linked document read access | No longer tenant-wide |
| `/sign-requests/create` | `sign_requests:create`, `documents:read`, `workflows:read`, `document_types:read` | Draft package still inherits document/resource rules |
| `/sign-requests/:id/editor` | `sign_requests:update` + linked document edit access | Field editing and signer editing inherit sign request management rules |
| `/approvals` | `approvals:read` | List is admin-wide only for `role=admin`; non-admin sees own approvals only |
| `/approvals/:id` | `approvals:read` + current approver ownership | Detail routes are approver-scoped |
| `/my-tasks` | `approvals:read` | Aggregates approvals and internal signing tasks for current user |
| `/users` | `users:read` | Mutations require `create/update/delete` accordingly |
| `/departments` | `departments:read` | Mutations require `create/update/delete` |
| `/roles` | `roles:read` | Mutations require `create/update/delete` |
| `/positions` | `positions:read` | Mutations require `create/update/delete` |
| `/document-types` | `document_types:read` | Read route also accepts `documents:read` for dependent UI consumers |
| `/workflows` | `workflows:read` | Mutations require `create/update/delete` |
| `/external-orgs` | `external_orgs:read` | Mutations require `create/update/delete` |
| `/webhooks` | `webhooks:read` | Mutations require `create/update/delete` |
| `/settings/system` | `settings:read` / `settings:update` | GET uses read, write/test uses update |
| `/settings/tenant` | `settings:read` / `settings:update` | Same convention should be followed |

## API matrix

### Documents

| API group | Permission | Extra authorization |
|---|---|---|
| `GET /documents` | `documents:read` | list filtered by resource-level document access |
| `GET /documents/:id*` | `documents:read` | `requireDocumentAccess('read')` |
| `POST /documents` | `documents:create` | tenant-scoped create |
| `POST/PUT document mutations` | `documents:update` | usually `requireDocumentAccess('edit')` or `approve` |
| `POST /documents/:id/permissions` | `documents:update` | `requireDocumentAccess('share')` |
| `DELETE /documents/:id` | `documents:delete` | `requireDocumentAccess('delete')` |

### Document flow

| API group | Permission | Extra authorization |
|---|---|---|
| `GET /documents/:id/flow` | `documents:read` | `requireDocumentAccess('read')` |

### Sign requests

| API group | Permission | Extra authorization |
|---|---|---|
| `GET /sign-requests` | `sign_requests:read` | filtered by linked document read access |
| `GET /sign-requests/:id` | `sign_requests:read` | linked document read access |
| `GET /sign-requests/:id/comments` | `sign_requests:read` | linked document read access |
| `POST /sign-requests` | `sign_requests:create` | document/workflow package validation |
| Draft edit endpoints | `sign_requests:update` | linked document edit access |
| `POST /sign-requests/:id/send` | `sign_requests:update` | linked document edit access |
| `POST /sign-requests/:id/remind` | `sign_requests:update` | linked document edit access |
| `DELETE /sign-requests/:id` | `sign_requests:delete` | draft-only + linked document edit access |

### Signers

| API group | Permission | Extra authorization |
|---|---|---|
| `POST /signers` | `sign_requests:update` | linked document edit access |
| `POST /signers/:id/send-otp` | `sign_requests:update` | linked document edit access |
| `POST /signers/:id/sign` | `sign_requests:read` | signer identity must match current user |

### Approvals

| API group | Permission | Extra authorization |
|---|---|---|
| `GET /approvals` | `approvals:read` | admin sees tenant scope; non-admin sees own approvals only |
| `GET /approvals/my-pending` | `approvals:read` | current user scope |
| `GET /approvals/my-tasks` | `approvals:read` | current user scope |
| `GET /approvals/:id` | `approvals:read` | current approver only |
| `GET /approvals/:id/comments` | `approvals:read` | current approver only |
| `POST /approvals/:id/comments` | `approvals:update` | current approver only |
| `POST /approvals/:id/approve` | `approvals:update` | current approver only |
| `POST /approvals/:id/reject` | `approvals:update` | current approver only |
| `POST /approvals/:id/request-info` | `approvals:update` | current approver only |
| `GET /approvals/document/:documentId` | `documents:read` | linked document read access |
| `GET /approvals/document/:documentId/workflow` | `documents:read` | linked document read access |
| `POST /approvals/submit` | `documents:update` | submit document into approval flow |

### Roles

| API group | Permission | Extra authorization |
|---|---|---|
| `GET /roles` | `roles:read` | tenant scope |
| `GET /roles/permissions` | `roles:read` | global catalog list |
| `POST /roles` | `roles:create` | tenant scope |
| `PUT /roles/:id` | `roles:update` | cannot edit system role |
| `DELETE /roles/:id` | `roles:delete` | cannot delete system role |

### Settings

| API group | Permission | Extra authorization |
|---|---|---|
| `GET /settings` | `settings:read` | tenant scope |
| `GET /settings/email` | `settings:read` | tenant scope |
| `POST /settings/email` | `settings:update` | tenant scope |
| `POST /settings/email/test` | `settings:update` | tenant scope |
| `GET /settings/watermark` | `settings:read` | tenant scope |
| `POST /settings/watermark` | `settings:update` | tenant scope |
| `GET /settings/document-type-policy/:id` | `settings:read` | tenant scope |
| `POST/DELETE /settings/document-type-policy/:id` | `settings:update` | tenant scope |

### Supporting admin modules

| Module | Read | Write |
|---|---|---|
| `document-types` | `document_types:read` | `document_types:create/update/delete` |
| `workflows` | `workflows:read` | `workflows:create/update/delete` |
| `positions` | `positions:read` | `positions:create/update/delete` |
| `external-orgs` | `external_orgs:read` | `external_orgs:create/update/delete` |
| `webhooks` | `webhooks:read` | `webhooks:create/update/delete` |
| `numbering-rules` | `settings:read` | `settings:update` |

## Current gaps still worth improving later

1. Some frontend pages still use role-based visibility text in addition to permission checks and should be normalized.
2. Existing databases may still have stale role assignments to removed legacy permissions until the sync migration is applied.
3. Permission names are now standardized, but several old Vietnamese UI strings in legacy files still need encoding cleanup.
