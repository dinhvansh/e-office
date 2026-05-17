# E-Office Business Process

This document defines the product workflow used by the current MVP.

## 1. Product Purpose

E-Office manages internal documents from draft creation through approval, electronic signing, storage, and audit review.

Primary users:

- Admin: configures tenant, users, roles, departments, positions, document types, and workflows.
- Document creator: creates drafts and submits signing packages.
- Approver: reviews and approves or rejects documents.
- Internal signer: signs authenticated internal documents.
- External signer: signs via public link and OTP when invited.
- Viewer/Auditor: reviews documents and audit logs according to permissions.

## 2. Core Workflow

Canonical flow:

```text
Create document draft
-> Open editor
-> Configure signers, workflow, and fields
-> Submit
-> Approval if required
-> Signing if required
-> Completed
```

The backend exposes workflow hints through:

- `flow_state`
- `next_action`
- `flow_counters`

Frontend screens should display actions from these fields instead of re-creating business logic locally.

## 3. Document Type Rules

Document type is the main business policy entry point.

It controls:

- Whether approval is required.
- Whether digital signing is required.
- Whether numbering is required.
- Which default workflow is applied.
- Whether users can override workflow.
- Optional access policy JSON for visibility and confidential-level restrictions.

Example policy:

```json
{
  "visibility": "department",
  "min_position_level": 3,
  "allow_departments": [1, 2],
  "deny_departments": [9],
  "allow_roles": ["Admin", "Manager"]
}
```

## 4. Status and Transition Rules

Draft states allow setup work. Submitted states restrict mutation.

Important rules:

- Draft can be edited by owner/admin/users with resource edit permission.
- Fields and signers must be configured before submit.
- Submitted requests cannot freely change signer/field setup.
- Approval must complete before signing when approval is required.
- Signing must complete before document completion.
- Reject/cancel/revoke should create audit events and block further signing.

## 5. Permission Rules

Access is layered:

1. Tenant isolation.
2. Module RBAC.
3. Resource-level document permission.
4. Department and position policy.
5. Document type policy.
6. Workflow participant policy.
7. Confidential-level restrictions.
8. Status-based mutation restrictions.
9. Explicit deny/allow override, with deny winning.

The full technical model is documented in [AUTHORIZATION-MODEL.md](AUTHORIZATION-MODEL.md).

## 6. Audit Requirements

The system should record audit events for:

- Login-sensitive actions where applicable.
- Document creation/upload.
- Sign request creation.
- Signer/field configuration.
- Submit.
- Approval/rejection.
- Signing.
- Download of signed artifact.
- Permission decision reports when requested by admins.

## 7. MVP Readiness Criteria

The MVP is acceptable when:

- A fresh clone can run with Docker.
- Admin account has usable permissions after seed.
- Document creation to completed signing is E2E tested.
- Authorization matrix passes.
- Error states are visible to users.
- Public signer links expose only signer-safe information.
- Product docs explain setup, business process, and test commands.
