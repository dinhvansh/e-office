# Document-service architecture

`documents.service.ts` remains the compatibility facade for existing HTTP controllers. It keeps controller-facing contracts, document creation orchestration, document-type policy handling, workflow setup, attachment/CC commands and authorization entry points.

Focused services own these boundaries:

- `documentQueries.service.ts`: tenant-scoped listing, permission filtering and post-authorization pagination.
- `documentFile.service.ts`: read original/signed files through the configured storage abstraction, legacy absolute-path compatibility, safe download naming and watermark rendering.
- `documentLifecycle.service.ts`: archive and cancellation transition persistence, including cancellation audit and signing/workflow state updates in one transaction.

The facade loads the document through tenant/ACL-aware query methods before delegating a file or lifecycle operation. Storage implementations remain behind `storageService` and `readStoredFile`; controllers do not receive storage-specific behavior.
