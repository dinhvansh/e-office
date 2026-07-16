# FlowDocker E-Office — Verified Business Process

Status: final UAT handoff. This specification reflects verified browser, PostgreSQL, outbox-worker, local-storage, and S3/MinIO behavior. It does not claim qualified PKI or PAdES signing.

## Actors and setup

Tenant Admin configures tenant master data (Departments, Positions, External Organizations/Contacts), Users, Roles and Permissions, Workflows, Document Types, and the Document Type → Workflow mapping. RBAC controls setup mutations; tenant scope is enforced by the backend.

## Verified request-to-completion flow

Requester creates a PDF-backed request, selects a Document Type, and submits it. The backend resolves the mapped workflow, snapshots it for the document, resolves approvers/signers, assigns signing fields, and creates the request package transactionally.

If approval is required, the request enters `AWAITING_APPROVAL`. My Tasks, notification, email-outbox, webhook-outbox, and audit side effects are created for the active actor. In a sequential approval workflow, every resolved approval record is materialized at submission: step 1 is `pending`; later steps are `waiting`. Completion atomically activates the next step, so the next assigned approver receives its task only after the preceding step completes. Reject routes the request to the supported reject/resubmit path.

After approval, internal signers activate in configured order. A later sequential signer cannot sign early; assigned signers can write only their assigned fields and required fields must be complete. External signing follows Invitation → Mailpit-delivered OTP → verified browser session → assigned fields → submit. Expired, revoked, consumed, or mismatched external sessions are denied.

When all required signatures complete, an artifact event is written to the outbox. The worker reads the source PDF, generates the signed artifact, writes to local storage or S3/MinIO, persists hash and artifact metadata, then marks the request `Completed`. Artifact/PDF/storage failure leaves the request `artifact_failed`, never Completed; authorized retry requeues work without duplicate artifact/event effects. Authorized actors can download the final PDF only after completion.

## Permission boundaries

Tenant Isolation, RBAC, document ACL/ownership, assigned Approver, assigned Signer, signing-field ownership, external OTP session binding, and backend authorization are enforcement boundaries. Hidden UI controls are not security boundaries. Unauthorized users cannot approve, sign, alter ACLs, access foreign-tenant documents, or bypass signing order.

## Side effects

Verified side effects are My Tasks, in-app notifications, email/webhook/artifact outbox events with deduplication/retry behavior, and audit history for approval, signing, artifact, and terminal transitions.
