# File storage

The backend persists portable storage keys such as `storage/42/<random>.pdf`.
Database records and APIs never use absolute filesystem paths.

## Local storage (default)

Set `FILE_STORAGE_DRIVER=local` (the Compose default). Files are written below
the backend working directory, so `storage/42/file.pdf` maps to
`/app/storage/42/file.pdf` in Docker. The `backend_storage` volume remains the
backwards-compatible local storage location.

Existing relative values using `storage/<tenant>/...`, including values created
with Windows path separators, remain readable. Absolute legacy paths are only
read by the document compatibility branch and are never created by new uploads.

## S3-compatible storage

Set the following only when a compatible endpoint is available:

```dotenv
FILE_STORAGE_DRIVER=s3
S3_ENDPOINT=https://minio.example.invalid
S3_REGION=us-east-1
S3_BUCKET=eoffice
S3_ACCESS_KEY_ID=replace-with-deployment-secret
S3_SECRET_ACCESS_KEY=replace-with-deployment-secret
S3_FORCE_PATH_STYLE=true
```

S3-compatible drivers include MinIO, Cloudflare R2, and Ceph gateways. The
application fails startup when `FILE_STORAGE_DRIVER` is not `local` or `s3`, or
when S3 is selected without its required endpoint, bucket, and credentials.

Keys are normalized before every operation. Traversal components (`..`), empty
path segments, and absolute paths are rejected. Upload names are reduced to a
safe basename and a random UUID is included in every new key.

`delete` is idempotent for local storage. Cleanup after a failed package or a
superseded progressive artifact is best-effort; it must not hide the original
workflow error.
