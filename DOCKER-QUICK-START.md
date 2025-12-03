# Docker Quick Start

## Start Services
```bash
docker-compose up -d
```

## Setup Database (First Time)
```bash
docker-compose exec backend npx prisma db push
docker-compose exec backend node scripts/seed-rbac.js
docker-compose exec backend node scripts/seed-document-types.js
docker-compose exec backend node scripts/seed-workflows-simple.js
docker-compose exec backend node scripts/seed-org-final.js
```

## Access
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- Login: `admin@acme.local` / `admin123`

## Useful Commands
```bash
docker-compose ps              # Check status
docker-compose logs -f         # View logs
docker-compose restart backend # Restart service
docker-compose down            # Stop all
```

## Full Documentation
See `docs/docker/` for complete guide.
