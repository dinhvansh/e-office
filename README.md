# E-Office

Multi-tenant document management, approval, and e-signature system.

## Services

- `frontend`: Next.js 14 dashboard and public signing UI
- `backend`: Express + TypeScript API with Prisma/PostgreSQL
- `license-server`: standalone license validation service

## Quick Start

### Local development

1. Install dependencies:

```bash
npm run install:all
```

2. Create environment files:

```bash
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env.local
copy license-server\.env.example license-server\.env
```

3. Start PostgreSQL and Redis, then run:

```bash
npm run dev
```

Default URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- License server: `http://localhost:5000`

### Docker

1. Create a compose env file from the example:

```bash
copy .env.compose.example .env
```

2. Review and replace the placeholder secrets and URLs in `.env`.

3. Start the stack:

```bash
docker compose up -d --build
```

## Environment Files

- `backend/.env.example`: backend runtime variables
- `frontend/.env.example`: frontend runtime/build variables
- `license-server/.env.example`: license service variables
- `.env.compose.example`: variables consumed by `docker-compose.yml`

## Current Status

- Local builds currently pass for `backend`, `frontend`, and `license-server`
- Frontend production build still skips type-checking and linting by config
- Deployment docs in `docs/` are partially historical; prefer the files linked below

## Key Documentation

- [docs/README.md](/e:/2.CODE/new%20office/e-office/docs/README.md)
- [FUNCTIONAL_SPEC.md](/e:/2.CODE/new%20office/e-office/FUNCTIONAL_SPEC.md)
- [START-HERE-E-OFFICE.md](/e:/2.CODE/new%20office/e-office/START-HERE-E-OFFICE.md)
- [docs/testing-guide.md](/e:/2.CODE/new%20office/e-office/docs/testing-guide.md)
- [docs/DEPLOYMENT-GUIDE.md](/e:/2.CODE/new%20office/e-office/docs/DEPLOYMENT-GUIDE.md)

## Upgrade Priorities

1. Remove build-time quality bypasses and make lint/type-check required.
2. Consolidate documentation around the actual deployed workflow.
3. Replace historical backup files in active source folders with clean git history.
4. Review and update vulnerable or deprecated npm dependencies.
