# File storage

The backend persists portable keys such as `storage/42/<random>.pdf`. Source
documents and final signed artifacts use the same selected storage driver.
Database records contain keys and artifact metadata/hashes, not file contents.

## Local storage (default)

```dotenv
FILE_STORAGE_DRIVER=local
STORAGE_BASE_PATH=./storage
```

In Docker, files are stored in the `backend_storage` named volume at
`/app/storage`. Back it up with `./scripts/backup.sh`.

## Before switching an existing deployment

Changing `FILE_STORAGE_DRIVER` does not migrate existing objects. If the
database already contains local storage keys, switching directly to S3 makes
those files unavailable because the application will look for the same keys in
the bucket.

Use S3 from the beginning, or copy every existing object to the bucket while
preserving its exact key before changing the driver. Keep a verified database
and storage backup until representative source documents and final artifacts
have been downloaded successfully from S3.

## Required S3 variables

All S3-compatible deployments require:

```dotenv
FILE_STORAGE_DRIVER=s3
S3_ENDPOINT=https://object-storage.example.com
S3_REGION=us-east-1
S3_BUCKET=eoffice
S3_ACCESS_KEY_ID=replace-with-application-access-key
S3_SECRET_ACCESS_KEY=replace-with-application-secret-key
S3_FORCE_PATH_STYLE=true
```

The bucket must already exist. It must remain private; browsers do not need
direct bucket access or bucket CORS because the backend performs object
operations.

The application identity needs these bucket-scoped operations:

- `s3:GetBucketLocation` and `s3:ListBucket` on the bucket;
- `s3:GetObject`, `s3:PutObject`, and `s3:DeleteObject` on bucket objects.

After changing `.env`, recreate backend and worker, then run the storage probe:

```bash
docker compose up -d --force-recreate backend outbox-worker
docker compose exec backend node scripts/verify-s3-storage.js
```

The probe writes, reads, verifies, and deletes one temporary object. It does not
create the bucket.

## AWS S3 example

Create a private bucket and a dedicated IAM access key. For region
`ap-southeast-1`:

```dotenv
FILE_STORAGE_DRIVER=s3
S3_ENDPOINT=https://s3.ap-southeast-1.amazonaws.com
S3_REGION=ap-southeast-1
S3_BUCKET=company-eoffice-production
S3_ACCESS_KEY_ID=<dedicated-iam-access-key>
S3_SECRET_ACCESS_KEY=<dedicated-iam-secret>
S3_FORCE_PATH_STYLE=false
```

Use a bucket name that is globally unique. Do not use the AWS account root
credentials and do not make the bucket public.

## Existing external MinIO example

Create a private bucket and dedicated MinIO application user first:

```dotenv
FILE_STORAGE_DRIVER=s3
S3_ENDPOINT=https://minio.example.com
S3_REGION=us-east-1
S3_BUCKET=eoffice
S3_ACCESS_KEY_ID=<dedicated-minio-user>
S3_SECRET_ACCESS_KEY=<dedicated-minio-secret>
S3_FORCE_PATH_STYLE=true
```

`S3_ENDPOINT` must be reachable from both the backend and outbox-worker
containers. Use the internal service URL when MinIO shares their Docker network;
otherwise use its private DNS or HTTPS endpoint.

## Bundled MinIO overlay

For a single-host self-hosted deployment, the optional overlay supplies MinIO,
a persistent `minio_data` volume, bucket creation, and a bucket-scoped
application user.

Add these values to the root `.env`:

```dotenv
FILE_STORAGE_DRIVER=s3
S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_BUCKET=eoffice
S3_ACCESS_KEY_ID=eoffice-app
S3_SECRET_ACCESS_KEY=<generate-a-long-random-application-secret>
S3_FORCE_PATH_STYLE=true

MINIO_ROOT_USER=minio-root
MINIO_ROOT_PASSWORD=<generate-a-different-long-random-root-password>
MINIO_CONSOLE_BIND_ADDRESS=127.0.0.1
MINIO_CONSOLE_PORT=9001
```

Generate the two secrets independently:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Start with both Compose files:

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.minio.yml \
  up -d --build
```

The MinIO API stays on the internal Compose network. The admin console binds to
`127.0.0.1:9001`; reach it through an SSH tunnel instead of publishing it to
the internet:

```bash
ssh -L 9001:127.0.0.1:9001 user@server
```

Then open `http://localhost:9001` locally and sign in with the `MINIO_ROOT_*`
credentials. The application itself uses the separate `S3_*` credentials.

Verify:

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.minio.yml \
  ps

docker compose \
  -f docker-compose.yml \
  -f docker-compose.minio.yml \
  exec backend node scripts/verify-s3-storage.js
```

Always include both Compose files for later `up`, `logs`, `stop`, and `down`
operations. Do not use `down --volumes` unless you intend to delete PostgreSQL,
local storage, and MinIO objects.

## Backup and recovery

`./scripts/backup.sh` backs up PostgreSQL and the local backend volume; it does
not export S3/MinIO bucket contents. Enable bucket versioning or replication and
back up the bucket using the object-store provider's supported tooling.

For bundled MinIO, the `minio_data` volume contains all objects, but a
filesystem-level copy is safe only with MinIO stopped and must be tested through
a full restore. Prefer MinIO replication or `mc mirror` to a separate target.
