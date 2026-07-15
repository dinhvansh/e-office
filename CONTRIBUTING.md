# Contributing to E-Office

## Development setup

1. Copy `.env.compose.example` to `.env` and replace every placeholder secret.
2. Install dependencies for the root, `backend`, `frontend`, and `license-server`.
3. Run the relevant checks before submitting a change.

## Pull requests

- Keep each pull request focused on one issue or behavior.
- Do not commit secrets, real documents, or production data.
- Preserve tenant isolation and server-side authorization.
- Add regression tests for security, workflow, or persistence changes.
- Do not disable linting, type checking, or tests to make a check pass.

## Required checks

```bash
cd backend
npm test
npm run build
npm run test:e2e:workflow
```

Run frontend checks when changing frontend code. Document migration and rollback
impact for every Prisma schema change.

## Reporting security issues

Do not open a public issue for a suspected vulnerability. Follow the repository
security policy once it is published, or contact the maintainers privately.
