# Sign-request architecture

`signRequests.service.ts` is the compatibility facade used by existing controllers and approval callers. It owns request authorization, audit invocation and stable public method contracts.

Focused collaborators own the following responsibilities:

- `signRequestQuery.service.ts`: tenant-scoped query/read models.
- `signRequestDraft.service.ts`: draft request persistence.
- `signerManagement.service.ts`: draft signer creation, updates, removal and ordering.
- `signRequestLifecycle.service.ts`: cancellation, artifact retry, deletion and revocation persistence.
- `signingProgress.service.ts`: workflow completion thresholds.
- `internalSigningCommand.service.ts`: atomic internal-signature state change, workflow transition, audit and outbox events.

The internal-signing transaction deliberately contains compare-and-set signer status mutation, sequential activation and outbox writes together. PDF generation and notification delivery remain after commit.
