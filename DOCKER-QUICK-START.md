# Docker Quick Start

This compatibility page replaces an obsolete guide that used Compose v1,
hard-coded container names, and `prisma db push`.

Use:

- [INSTALL-DEMO.md](INSTALL-DEMO.md) for disposable evaluation;
- [INSTALL-PRODUCTION.md](INSTALL-PRODUCTION.md) for retained deployments;
- [docs/docker/README.md](docs/docker/README.md) for Docker architecture and
  test stacks.

Do not run `prisma db push` against retained data. The backend applies committed
migrations automatically with `prisma migrate deploy`.
