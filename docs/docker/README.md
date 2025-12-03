# Docker Deployment

## Quick Start

```bash
# 1. Kiểm tra Docker
.\docs\docker\start-docker-test.ps1

# 2. Start services
docker-compose up -d

# 3. Setup database
docker-compose exec backend npx prisma db push
docker-compose exec backend node scripts/seed-rbac.js
docker-compose exec backend node scripts/seed-document-types.js
docker-compose exec backend node scripts/seed-workflows-simple.js
docker-compose exec backend node scripts/seed-org-final.js

# 4. Access
# Frontend: http://localhost:3000
# Backend:  http://localhost:4000
# Login:    admin@acme.local / admin123
```

## Files

- `DOCKER-DEPLOYMENT-GUIDE.md` - Hướng dẫn đầy đủ
- `DOCKER-BUILD-SUCCESS.md` - Kết quả test và troubleshooting
- `docker-test.md` - Test guide chi tiết
- `start-docker-test.ps1` - Script kiểm tra Docker Desktop
- `docker-quick-test.ps1` - Script test tự động (Windows)
- `docker-quick-test.sh` - Script test tự động (Linux/Mac)

## Services

- Backend: Node.js + TypeScript + Prisma (port 4000)
- Frontend: Next.js 14 (port 3000)
- Database: PostgreSQL 16 (port 5432)
- Redis: 7-alpine (port 6379)
- License Server: Node.js (port 5000)

## Notes

- Backend chạy với `ts-node --transpileOnly` (skip type checking)
- Frontend build với `ignoreBuildErrors: true`
- JWT secrets phải >= 32 characters
- Alpine Linux cần OpenSSL cho Prisma
