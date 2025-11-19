# 🏢 E-Office - Document Management & Approval System

Enterprise-grade document management and approval workflow system with multi-tenant support.

## 🚀 Quick Start

```bash
# 1. Setup backend
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
node scripts/seed.js
node scripts/seed-rbac.js
npm run dev

# 2. Setup frontend
cd frontend
npm install
cp .env.example .env.local
npm run dev

# 3. Access
Frontend: http://localhost:3000
Backend: http://localhost:4000
Login: admin@example.com / admin123
```

## 📚 Documentation

### Getting Started
- **[QUICK-START.md](QUICK-START.md)** - Quick setup guide
- **[QUICK-START-E-OFFICE.md](QUICK-START-E-OFFICE.md)** - E-Office development guide
- **[README-TESTING.md](README-TESTING.md)** - Testing guide

### Architecture & Planning
- **[ERD.md](ERD.md)** - Database schema (full E-Office)
- **[FUNCTIONAL_SPEC.md](FUNCTIONAL_SPEC.md)** - Functional requirements
- **[ROADMAP-E-OFFICE.md](ROADMAP-E-OFFICE.md)** - 14-week development roadmap
- **[SYSTEM-COMPARISON.md](SYSTEM-COMPARISON.md)** - Current vs target comparison
- **[PHASE-1-PLAN.md](PHASE-1-PLAN.md)** - Detailed Phase 1 plan (2 weeks)

### Technical Docs
- **[docs/testing-guide.md](docs/testing-guide.md)** - Testing strategies
- **[docs/email-setup.md](docs/email-setup.md)** - Email configuration
- **[test-api.http](test-api.http)** - API testing (REST Client)

### Setup & Deployment
- **[docs/setup/](docs/setup/)** - GitHub setup guides
- **[docs/dev/](docs/dev/)** - Development logs (AGENTS.md, CHANGELOG.md)
- **[docs/archive/](docs/archive/)** - Old documentation

## ✨ Features

### Current (E-Signature Base) ✅
- Multi-tenant architecture
- User/Department/Role management with RBAC
- Document upload & storage
- Sign request workflow with OTP
- Email integration (Gmail, Outlook, SendGrid, AWS SES, Mailgun)
- License management (offline validation)
- Webhook notifications
- Audit logs

### Planned (E-Office Full) 🚧
- Document types & auto-numbering
- Multi-step approval workflow
- Incoming/Outgoing documents
- Contract management
- Advanced search & filters
- Dashboard & KPI reports
- Real-time notifications
- Version control & comparison

## 🏗️ Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS, React Query
- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Database**: PostgreSQL
- **Cache**: Redis
- **Email**: Nodemailer
- **License**: JWT-based offline validation

## 📁 Project Structure

```
├── backend/              # Express API server
│   ├── src/
│   │   ├── modules/      # Feature modules
│   │   ├── middleware/   # Auth, permissions
│   │   └── config/       # Configuration
│   ├── prisma/           # Database schema
│   └── scripts/          # Seed & test scripts
├── frontend/             # Next.js dashboard
│   └── app/
│       └── (dashboard)/  # Protected routes
├── license-server/       # License validation
├── docs/                 # Documentation
└── docker-compose.yml    # Dev environment
```

## 🗺️ Development Roadmap

| Phase | Duration | Focus | Status |
|-------|----------|-------|--------|
| Phase 0 | ✅ Done | E-Signature Base | Complete |
| Phase 1 | Week 1-2 | Document Types + Numbering | 🔜 Next |
| Phase 2 | Week 3-4 | Workflow Engine | Pending |
| Phase 3 | Week 5-6 | In/Out Documents | Pending |
| Phase 4 | Week 7-8 | Advanced Features | Pending |
| Phase 5 | Week 9-10 | Dashboard & Reports | Pending |
| Phase 6 | Week 11-12 | Integrations | Pending |
| Phase 7 | Week 13-14 | Testing & Polish | Pending |

**Total Timeline**: 14 weeks (~3.5 months)

See [ROADMAP-E-OFFICE.md](ROADMAP-E-OFFICE.md) for details.

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# E2E tests
cd frontend
npm run test:e2e

# API testing
# Open test-api.http in VS Code with REST Client extension
```

## 🔐 Security

- Role-based access control (RBAC)
- Granular permissions (27 permissions across 7 resources)
- JWT authentication
- Password hashing (bcrypt)
- Tenant data isolation
- Audit logging

## 📧 Email Configuration

Supports multiple providers:
- Gmail
- Outlook
- SendGrid
- AWS SES
- Mailgun

See [docs/email-setup.md](docs/email-setup.md) for configuration.

## 🚢 Deployment

### Environment Variables
See `.env.example` files in each service folder.

### Database Migrations
```bash
cd backend
npx prisma migrate deploy
```

### Production Build
```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
```

## 📝 License

[Your License Here]

## 🤝 Contributing

See [docs/dev/AGENTS.md](docs/dev/AGENTS.md) for development guidelines.

## 📞 Support

For issues and questions, please check:
1. [QUICK-START.md](QUICK-START.md)
2. [docs/testing-guide.md](docs/testing-guide.md)
3. [FUNCTIONAL_SPEC.md](FUNCTIONAL_SPEC.md)

---

**Built with ❤️ for enterprise document management**
