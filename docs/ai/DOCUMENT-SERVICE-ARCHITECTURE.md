# Document-service architecture

`documents.service.ts` remains the compatibility facade for existing HTTP controllers. It keeps controller-facing contracts, document creation orchestration, document-type policy handling, workflow setup, attachment/CC commands and authorization entry points.

Focused services own these boundaries:

- `documentQueries.service.ts`: tenant-scoped listing, permission filtering and post-authorization pagination.
- `documentFile.service.ts`: read original/signed files through the configured storage abstraction, legacy absolute-path compatibility, safe download naming and watermark rendering.
- `documentLifecycle.service.ts`: archive and cancellation transition persistence, including cancellation audit and signing/workflow state updates in one transaction.

The facade loads the document through tenant/ACL-aware query methods before delegating a file or lifecycle operation. Storage implementations remain behind `storageService` and `readStoredFile`; controllers do not receive storage-specific behavior.

## Storage drivers and compatibility

`FILE_STORAGE_DRIVER=local` is the default. Local storage retains read
compatibility for legacy absolute file paths, while new records use portable
relative keys. Set `FILE_STORAGE_DRIVER=s3` with the `S3_*` connection settings
to use an S3-compatible provider; in this mode arbitrary absolute filesystem
paths are never interpreted as object keys. Both adapters reject traversal and
absolute-key inputs before performing storage I/O.

The Docker E2E suite exercises the same document and outbox workflow against
MinIO (`npm run e2e:s3`), including source upload, authorization-protected
download, signed-artifact generation, metadata/hash persistence, missing
objects and idempotent deletion. The local equivalent remains
`npm run e2e:docker`.
