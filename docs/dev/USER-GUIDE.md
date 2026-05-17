# E-Office User Guide

This guide describes the core screens and the normal user journey for the E-Office document workflow.

## 1. Login

- Open the frontend URL, usually `http://localhost:3000`.
- Sign in with a seeded account.
- Demo admin account:
  - Email: `admin@acme.local`
  - Password: `secret123`

If login fails, check that the backend is healthy at `http://localhost:4000/health` and that the database seed has completed.

## 2. Main Navigation

The sidebar is permission-aware. A user only sees modules allowed by backend RBAC and frontend route guards.

Common modules:

- Documents: uploaded documents and generated document records.
- Sign Requests: signing packages created from documents.
- Approvals: tasks waiting for internal approval.
- Document Types: rules for approval/signing and numbering.
- Departments and Positions: organization structure used by access rules.
- Settings: tenant-level configuration.

## 3. Create Document and Signing Package

Recommended flow:

1. Go to Sign Requests.
2. Choose Create.
3. Upload or create the document draft.
4. Select the document type.
5. Open the editor.
6. Add signers and workflow participants.
7. Place required fields on the PDF.
8. Submit the request.

After submit, the system chooses the next state:

- `AWAITING_APPROVAL` when the document type requires approval.
- `AWAITING_SIGNATURES` when approval is not required but signing is required.
- `COMPLETED` only after all required approval/signing actions finish.

## 4. Approval

Approvers use the Approvals screen or their pending task list.

Allowed actions:

- Review document metadata and file.
- Approve with comment/signature if required.
- Reject with reason.

The system must only show approval actions to assigned approvers or users with explicit administrative permission.

## 5. Signing

Internal signers use the authenticated signing screen.

External signers use a public signing link plus OTP where configured. Public signing routes must not expose internal tenant data, roles, departments, or unrelated document metadata.

Expected signer behavior:

- Review the document.
- Fill assigned required fields.
- Submit signature.
- Receive success state after signing.

## 6. Admin Setup Checklist

- Seed RBAC permissions and roles.
- Create departments and positions.
- Assign users to departments and positions.
- Create document types.
- Configure document type policy, workflow, numbering, and approval requirement.
- Verify permission matrix with `npm run e2e:auth`.

## 7. Common Troubleshooting

- Empty dashboard after admin login: run RBAC seed and verify user role assignment.
- Cannot create document: check `documents:create` permission and document type policy.
- Cannot edit fields: check request status and resource-level `can_edit` decision.
- Signer cannot sign: check signer assignment, signer status, token/OTP validity, and request `flow_state`.
