# API Response Guideline

## 1. Success Envelope
- Preferred shape:
```json
{
  "success": true,
  "data": {}
}
```
- For list endpoints:
```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 0,
      "totalPages": 0
    }
  }
}
```

## 2. Error Envelope
- Preferred shape:
```json
{
  "success": false,
  "error": {
    "code": "DOMAIN_ERROR_CODE",
    "message": "Human-readable message",
    "requestId": "uuid"
  }
}
```
- HTTP code must reflect failure category:
  - `400` validation/domain rule violation
  - `401` unauthenticated
  - `403` forbidden
  - `404` not found
  - `409` conflict
  - `422` semantic validation (optional)
  - `500` unexpected server error

## 3. Workflow Contract (Document -> Approval -> Signing)
- `sign_request` responses should include:
  - `flow_state`: `DRAFT | AWAITING_APPROVAL | AWAITING_SIGNATURES | COMPLETED | CANCELLED | REJECTED`
  - `next_action`: `EDIT_AND_SEND | WAIT_FOR_APPROVAL | WAIT_FOR_SIGNING | VIEW_COMPLETED | REVIEW_STATUS`
  - `flow_counters`: `{ total_signers, pending, waiting_approval, waiting_signing, signed }`

## 4. Compatibility Notes
- Some legacy modules currently return mixed envelopes (`ok(...)` vs manual `{ success, data }`).
- Migration rule:
  - Keep backward compatibility for existing clients.
  - New endpoints must follow this guideline.
  - Existing endpoints should be normalized gradually by module.
