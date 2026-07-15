# Outbox worker architecture

The outbox worker is the only runtime that performs retryable PDF, email and
webhook delivery. Request handlers persist domain state and an outbox row; they
do not make SMTP or webhook HTTP calls.

## Event types

- `SIGNED_ARTIFACT_REQUESTED` generates and persists the signed PDF.
- `EMAIL_DELIVERY_REQUESTED` carries a named template and its structured input.
- `SIGN_REQUEST_CREATED`, `DOCUMENT_REJECTED`, `SIGNATURE_SUBMITTED`,
  `SIGN_COMPLETED`, `SIGNER_ACTIVATED`, `APPROVAL_STEP_ACTIVATED`, and
  `APPROVAL_WORKFLOW_COMPLETED` deliver the corresponding tenant-scoped webhook.

OTP messages remain a deliberate exception: raw OTPs are never written to an
outbox payload. They use the existing short-lived OTP delivery path.

## Retry and failure states

Rows are claimed with `processing` and a timestamp. Claims older than five
minutes are returned to `pending` for restart recovery. Retry delays are
exponential (2 seconds through one hour) and delivery stops after five attempts.
Network and webhook 5xx errors are retryable; webhook 4xx responses and invalid
delivery events become `failed` immediately. `last_error`, attempts, timestamps
and status remain on the outbox row for operations inspection.

## Idempotency and troubleshooting

`deduplication_key` is unique. Domain events use their aggregate/action keys;
template emails use stable template, recipient and document URL references.
Inspect pending and failed `outbox_events` rows before retrying. Do not log SMTP
credentials, webhook secrets, raw OTPs, document contents, or full response
bodies. A failed delivery never changes document, approval, signing, or artifact
state.
