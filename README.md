# 🏢 E-Office - Document Management & Approval System

Enterprise-grade document management and approval workflow system with multi-tenant support.

## 🚀 Quick Start

### First Time Setup

```bash
# 1. Clone repository
git clone https://github.com/dinhvansh/e-office.git
cd e-office

# 2. Setup backend
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
node scripts/seed.js
node scripts/seed-rbac.js
node scripts/seed-document-types.js
node scripts/seed-workflows-simple.js

# 3. Setup frontend
cd ../frontend
npm install
cp .env.example .env.local

# 4. Start all services (from root)
cd ..
./start-all.ps1

# 5. Access
Frontend: http://localhost:3000
Backend: http://localhost:4000
Login: admin@acme.local / secret123
```

### After Pull (Update)

```bash
# Pull latest code
git pull origin main

# Install new dependencies
cd frontend && npm install
cd ../backend && npm install

# Start servers
cd ..
./start-all.ps1
```

**📖 See [SETUP-FOR-DEV1.md](SETUP-FOR-DEV1.md) for detailed setup guide**

## 📚 Documentation

### 🚀 Getting Started
- **[SETUP-FOR-DEV1.md](SETUP-FOR-DEV1.md)** - ⭐ Setup guide after pull (NEW)
- **[QUICK-START.md](QUICK-START.md)** - Quick setup guide
- **[START-SERVERS.md](START-SERVERS.md)** - Server management
- **[README-TESTING.md](README-TESTING.md)** - Testing guide

### 📋 Architecture & Planning
- **[ERD.md](ERD.md)** - Database schema (full E-Office)
- **[FUNCTIONAL_SPEC.md](FUNCTIONAL_SPEC.md)** - Functional requirements
- **[ROADMAP-E-OFFICE.md](ROADMAP-E-OFFICE.md)** - 14-week development roadmap
- **[SYSTEM-COMPARISON.md](SYSTEM-COMPARISON.md)** - Current vs target comparison
- **[PHASE-1-PLAN.md](PHASE-1-PLAN.md)** - Phase 1 plan (COMPLETE)
- **[PHASE-2-PLAN.md](PHASE-2-PLAN.md)** - Phase 2 plan (90% complete)

### 🔧 Technical Docs
- **[CODE-MAP.md](CODE-MAP.md)** - Codebase architecture guide
- **[docs/testing-guide.md](docs/testing-guide.md)** - Testing strategies
- **[docs/email-setup.md](docs/email-setup.md)** - Email configuration
- **[test-api.http](test-api.http)** - API testing (REST Client)
- **[SECURITY-AUDIT-REPORT.md](SECURITY-AUDIT-REPORT.md)** - Security audit
- **[SECURITY-QUICK-FIXES.md](SECURITY-QUICK-FIXES.md)** - Security improvements

### 📝 Development Logs
- **[docs/dev/SESSION-2025-11-21-UI-IMPROVEMENTS.md](docs/dev/SESSION-2025-11-21-UI-IMPROVEMENTS.md)** - Latest session
- **[docs/dev/SESSION-2025-11-20-PHASE-2-FRONTEND-COMPLETE.md](docs/dev/SESSION-2025-11-20-PHASE-2-FRONTEND-COMPLETE.md)** - Phase 2 frontend
- **[AGENTS.md](AGENTS.md)** - AI development log
- **[LESSONS-LEARNED.md](LESSONS-LEARNED.md)** - Critical patterns & pitfalls

## ✨ Features

### Phase 0: E-Signature Base ✅
- ✅ Multi-tenant architecture
- ✅ User/Department/Role management with RBAC (27 permissions)
- ✅ Document upload & storage
- ✅ Sign request workflow with OTP
- ✅ Email integration (Gmail, Outlook, SendGrid, AWS SES, Mailgun)
- ✅ License management (offline validation)
- ✅ Webhook notifications
- ✅ Audit logs

### Phase 1: Foundation Enhancement ✅ (100%)
- ✅ Document types (8 types with icons)
- ✅ Auto-numbering system (pattern-based)
- ✅ External organizations (5 seeded)
- ✅ Document tags
- ✅ Document permissions (granular)
- ✅ Document versions
- ✅ Full CRUD operations
- ✅ Document visibility & access control

### Phase 2: Workflow Engine 🚧 (90%)
- ✅ Workflow templates (card grid UI)
- ✅ Multi-step configuration
- ✅ Approval flow (Approve/Reject/Request Info)
- ✅ Approver types (User/Role/Department/Manager)
- ✅ Step management UI
- ✅ Workflow selection in document upload
- 🔜 Email notifications
- 🔜 Deadline tracking & reminders

### Phase 3-7: Planned 🔜
- Incoming/Outgoing documents
- Contract management
- Advanced search & filters
- Dashboard & KPI reports
- Real-time notifications (WebSocket)
- Version control & comparison

## 🏗️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: React 18, TailwindCSS, shadcn/ui
- **Components**: @radix-ui (Dialog, Switch, Tabs)
- **State**: React Query, Context API
- **Icons**: Lucide React
- **Notifications**: Sonner (toast)
- **Date**: dayjs

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL 14+
- **Cache**: Redis
- **Email**: Nodemailer
- **Auth**: JWT + bcrypt
- **Validation**: Zod

### DevOps
- **Containerization**: Docker + Docker Compose
- **License**: JWT-based offline validation
- **File Storage**: Local filesystem (configurable)

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

| Phase | Duration | Focus | Status | Progress |
|-------|----------|-------|--------|----------|
| Phase 0 | ✅ Done | E-Signature Base | Complete | 100% |
| Phase 1 | Week 1-2 | Document Types + Numbering | ✅ Complete | 100% |
| Phase 2 | Week 3-4 | Workflow Engine | 🚧 In Progress | 90% |
| Phase 3 | Week 5-6 | In/Out Documents | 🔜 Next | 0% |
| Phase 4 | Week 7-8 | Advanced Features | Pending | 0% |
| Phase 5 | Week 9-10 | Dashboard & Reports | Pending | 0% |
| Phase 6 | Week 11-12 | Integrations | Pending | 0% |
| Phase 7 | Week 13-14 | Testing & Polish | Pending | 0% |

**Total Timeline**: 14 weeks (~3.5 months)  
**Current Progress**: Week 4 of 14 (28% complete)

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
