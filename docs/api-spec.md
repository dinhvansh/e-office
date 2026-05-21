# API Specification – E-Signature SaaS

## Authentication
### POST /api/v1/auth/login
- email
- password

### POST /api/v1/auth/refresh
- refresh_token

---

## Tenants
### GET /api/v1/tenants/me
Returns current tenant info.

---

## Documents
### POST /api/v1/documents
Upload PDF document.

### GET /api/v1/documents
List documents.

### GET /api/v1/documents/{id}
Get document detail.

### DELETE /api/v1/documents/{id}
Delete a document.

---

## Sign Requests
### POST /api/v1/sign-requests
Create new signing request.

### GET /api/v1/sign-requests/{id}
Get signing request detail.

### POST /api/v1/sign-requests/{id}/cancel
Cancel the request.

---

## Signers
### POST /api/v1/signers
Add signer to request.

### POST /api/v1/signers/{id}/send-otp
Send OTP to signer.

### POST /api/v1/signers/{id}/sign
Submit signature data.

---

## Audit Logs
### GET /api/v1/audit/{document_id}
Returns audit log for a document.

---

## Webhooks
### POST /api/v1/webhooks/register
Register a webhook endpoint.

### GET /api/v1/webhooks/api-tokens
List API tokens configured for the current tenant.

### POST /api/v1/webhooks/api-tokens
Create a new API token for the current tenant.

### DELETE /api/v1/webhooks/api-tokens/{tokenId}
Revoke an API token.

### Events
- document.uploaded
- sign.started
- sign.completed
- sign.declined
