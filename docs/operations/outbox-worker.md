# Signed-artifact outbox worker

Final signed PDFs are generated asynchronously. The signing request commits its
signer changes, enters `generating_artifact`, and writes one
`SIGNED_ARTIFACT_REQUESTED` event in the same database transaction. The HTTP
request does not generate or expose the artifact.

## Run locally

Start PostgreSQL and Redis, apply the reviewed migrations, build the backend,
then run the worker in a separate terminal:

```powershell
cd backend
npx prisma migrate deploy
npm run build
npm run worker:outbox
```

`OUTBOX_POLL_INTERVAL_MS` controls the idle polling interval (default: 2000).
The worker uses the same `DATABASE_URL`, storage configuration, and PDF font
variables as the backend. It handles SIGTERM/SIGINT after its current batch.

## Docker

`docker compose up` starts the `outbox-worker` service with the same persistent
`backend_storage` volume as the API. It waits for healthy PostgreSQL and Redis
and runs `prisma migrate deploy` before polling. View failures with:

```powershell
docker compose logs -f outbox-worker
```

An event is claimed with a conditional update, retried with bounded exponential
backoff (five attempts), and old worker locks are recovered after five minutes.
The canonical storage key is deterministic per document, so retrying an event
does not create a second signed artifact. A failed job sets the request and
document to `artifact_failed`; the existing retry action enqueues a new event.

The public signed-PDF endpoint returns `SIGNED_ARTIFACT_NOT_READY` until the
worker has persisted a readable artifact and SHA-256 metadata. It never returns
an internal storage path or a worker stack trace.
