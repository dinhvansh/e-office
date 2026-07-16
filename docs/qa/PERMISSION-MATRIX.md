# Executed Permission Matrix — 2026-07-15

This is an audit result, not an assertion that untested cells are allowed or denied.

| Control | UI | Direct URL | Direct API | Result / evidence |
|---|---|---|---|---|
| Disabled user / tenant | Not run | Not run | PASS | Backend policy suite rejected disabled/inactive/pending users and tenants; E2E checked disabled-user/session revocation. |
| Admin/master-data endpoints by normal user | Not run | Not run | PASS (matrix) | Admin Department lifecycle (create/update status/delete) is verified in real UAT browser/API flow. User denied document-type create; Viewer denied department create/position update; Manager denied department update. |
| External organization contact identity | PASS (read-after-create UI) | Not run | PASS (Admin + matrix negative) | Real UAT API/browser lifecycle rejects duplicate code and contact email within the tenant. Authorization matrix confirms User create, Viewer update, and cross-tenant Viewer read are denied. |
| Assigned approver only | Not run | Not run | PASS (policy) | Tenant-scoped assigned task tests passed; E2E duplicate approval rejected. |
| Assigned signer only / ordering | Not run | Not run | PASS (policy) | Order-two signer denied before order-one; duplicate signing denied. |
| Signing field ownership | Not run | Not run | PASS (policy) | Guessed other-signer/other-request fields denied before mutation. |
| Public external OTP/session | Not run | Not run | PASS (policy) | Pre-OTP original PDF denied; valid session allowed; expired/consumed session denied. |
| Tenant A → Tenant B document | Not run | Not run | PASS (matrix + S3 E2E) | Cross-tenant viewer denied foreign document; S3 E2E also accepts only 403/404. |
| Tenant isolation: list/search/artifact/notifications/approvals/signing/admin | Not run | Not run | Not run | Full matrix outstanding. |
| ID tampering: tenant/owner/document/workflow/request/signer/field/artifact | Not run | Not run | PARTIAL | Field and cross-request field guessing denied; remaining identifiers outstanding. |
| ACL precedence / removed ACL / multiple roles | Not run | Not run | Not run | Outstanding. |

Fresh PostgreSQL API matrix passed: Admin create/update department/document type/position; Manager/User document create; Viewer document list; expected negative role checks; cross-tenant denial.

**Matrix result: NOT PASS.** Browser/direct-URL verification and several required API tampering/ACL cases remain incomplete; hidden UI controls are not treated as an authorization boundary.
