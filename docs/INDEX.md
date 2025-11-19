# 📚 Documentation Index

## 🎯 Start Here

**New to the project?** Read in this order:
1. [../README.md](../README.md) - Project overview
2. [../QUICK-START.md](../QUICK-START.md) - Setup guide
3. [../QUICK-START-E-OFFICE.md](../QUICK-START-E-OFFICE.md) - E-Office development

## 📋 Planning & Architecture

### System Design
- [../ERD.md](../ERD.md) - Complete database schema
- [../FUNCTIONAL_SPEC.md](../FUNCTIONAL_SPEC.md) - Functional requirements (17 sections)
- [../SYSTEM-COMPARISON.md](../SYSTEM-COMPARISON.md) - Current vs target features

### Development Roadmap
- [../ROADMAP-E-OFFICE.md](../ROADMAP-E-OFFICE.md) - 7-phase plan (14 weeks)
- [../PHASE-1-PLAN.md](../PHASE-1-PLAN.md) - Detailed Phase 1 (Document Types + Numbering)

## 🧪 Testing & Quality

- [../README-TESTING.md](../README-TESTING.md) - Testing overview
- [testing-guide.md](testing-guide.md) - Detailed testing strategies
- [../test-api.http](../test-api.http) - API test collection (REST Client)
- [../TEST-CHECKLIST.md](../TEST-CHECKLIST.md) - Manual test checklist

## ⚙️ Configuration

- [email-setup.md](email-setup.md) - Email service configuration
- [../backend/.env.example](../backend/.env.example) - Backend environment variables
- [../frontend/.env.example](../frontend/.env.example) - Frontend environment variables

## 🚀 Setup & Deployment

### GitHub Setup
- [setup/GITHUB-SETUP-SIMPLE.md](setup/GITHUB-SETUP-SIMPLE.md) - Simple GitHub guide
- [setup/PUSH-TO-GITHUB.md](setup/PUSH-TO-GITHUB.md) - Detailed push guide
- [setup/PRE-PUSH-CHECKLIST.md](setup/PRE-PUSH-CHECKLIST.md) - Pre-push checklist
- [setup/setup-git.ps1](setup/setup-git.ps1) - Automated setup script
- [setup/check-before-push.ps1](setup/check-before-push.ps1) - Pre-push validation

## 👨‍💻 Development

### Development Logs
- [dev/AGENTS.md](dev/AGENTS.md) - AI assistant progress log
- [dev/CHANGELOG.md](dev/CHANGELOG.md) - Change history
- [dev/DOCUMENTATION-INDEX.md](dev/DOCUMENTATION-INDEX.md) - Old doc index

### Archived Docs
- [archive/](archive/) - Old setup guides and summaries

## 📊 Quick Reference

### Database Schema
```
Core Tables:
- tenants, users, departments, roles, permissions
- documents, document_types, numbering_rules
- workflows, workflow_steps, document_approvals
- incoming_documents, outgoing_documents
- external_organizations
```

### API Endpoints
```
Auth:        /api/v1/auth/*
Users:       /api/v1/users/*
Departments: /api/v1/departments/*
Roles:       /api/v1/roles/*
Documents:   /api/v1/documents/*
Sign Reqs:   /api/v1/sign-requests/*
```

### Tech Stack
- Frontend: Next.js 14 + TailwindCSS
- Backend: Express + TypeScript + Prisma
- Database: PostgreSQL + Redis
- Email: Nodemailer (SMTP)

## 🗺️ Development Phases

| Phase | Focus | Duration | Status |
|-------|-------|----------|--------|
| 0 | E-Signature Base | 4 weeks | ✅ Done |
| 1 | Document Types + Numbering | 2 weeks | 🔜 Next |
| 2 | Workflow Engine | 2 weeks | Pending |
| 3 | In/Out Documents | 2 weeks | Pending |
| 4 | Advanced Features | 2 weeks | Pending |
| 5 | Dashboard & Reports | 2 weeks | Pending |
| 6 | Integrations | 2 weeks | Pending |
| 7 | Testing & Polish | 2 weeks | Pending |

## 🔍 Find What You Need

**Want to...**
- **Setup project?** → [../QUICK-START.md](../QUICK-START.md)
- **Understand architecture?** → [../ERD.md](../ERD.md) + [../FUNCTIONAL_SPEC.md](../FUNCTIONAL_SPEC.md)
- **Start development?** → [../PHASE-1-PLAN.md](../PHASE-1-PLAN.md)
- **Test features?** → [testing-guide.md](testing-guide.md)
- **Configure email?** → [email-setup.md](email-setup.md)
- **Push to GitHub?** → [setup/GITHUB-SETUP-SIMPLE.md](setup/GITHUB-SETUP-SIMPLE.md)
- **Check progress?** → [dev/AGENTS.md](dev/AGENTS.md)

---

**Last Updated**: 2025-11-18
