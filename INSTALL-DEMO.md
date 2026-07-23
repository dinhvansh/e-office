# Install a disposable demo

This path creates sample users, departments, document types, and workflows. Use
it only for evaluation on a new database. Do not point it at retained data.

## Requirements

- Docker Engine or Docker Desktop
- Docker Compose v2 (`docker compose version`)
- Bash and OpenSSL
- At least 4 GB RAM recommended for the first image build

## Install

Clone the repository and enter it:

```bash
git clone https://github.com/dinhvansh/e-office.git
cd e-office
```

Choose a unique password of at least 16 characters and run:

```bash
DEMO_ADMIN_PASSWORD='replace-with-a-unique-password' ./install.sh demo
```

The installer:

1. copies `.env.compose.example` to `.env`;
2. generates independent database, JWT, refresh-token, and optional license
   secrets;
3. enables `AUTO_INIT_DB=true`;
4. validates the resolved Compose configuration;
5. builds and starts the stack;
6. waits for backend and frontend readiness.

Open:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:4000/health`
- Login email: `admin@acme.local`
- Password: the value supplied through `DEMO_ADMIN_PASSWORD`

## Verify

```bash
docker compose ps
curl --fail http://localhost:4000/health
curl --fail http://localhost:3000/
```

## Stop or remove

Stop while preserving data:

```bash
docker compose stop
```

Remove containers while preserving named volumes:

```bash
docker compose down
```

Delete demo data only when you explicitly intend to:

```bash
docker compose down --volumes
```

To install again after deleting `.env`, rerun `install.sh demo`. The installer
will not overwrite an existing `.env` unless `--force-env` is supplied.
