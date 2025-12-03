# E-Office Documentation

## 📚 Documentation Structure

### Setup & Deployment
- **[Docker Deployment](docker/README.md)** - Docker setup và deployment guide
- **[Email Setup](email-setup.md)** - Cấu hình email notifications
- **[Testing Guide](testing-guide.md)** - Hướng dẫn test

### Development
- **[Development Docs](dev/README.md)** - Development guides và session logs
- **[API Spec](api-spec.md)** - API documentation
- **[SaaS Onboarding](SAAS-ONBOARDING-API.md)** - Multi-tenant onboarding API

### Project Info
- **[Functional Spec](../FUNCTIONAL_SPEC.md)** - Product requirements
- **[Start Here](../START-HERE-E-OFFICE.md)** - Project overview
- **[Security Checklist](../SECURITY-CHECKLIST.md)** - Security guidelines
- **[Production Ready](../PRODUCTION-READY-SUMMARY.md)** - Production deployment checklist

## 🚀 Quick Links

### For Developers
1. Start with [START-HERE-E-OFFICE.md](../START-HERE-E-OFFICE.md)
2. Setup environment: [Docker](docker/README.md) or Local
3. Read [Development Rules](dev/README.md)
4. Check [Testing Guide](testing-guide.md)

### For DevOps
1. [Docker Deployment Guide](docker/DOCKER-DEPLOYMENT-GUIDE.md)
2. [Production Checklist](../PRODUCTION-READY-SUMMARY.md)
3. [Security Checklist](../SECURITY-CHECKLIST.md)

### For Product/PM
1. [Functional Spec](../FUNCTIONAL_SPEC.md)
2. [Feature Status](dev/PHASE-1-FINAL-STATUS.md)
3. [Development Sessions](dev/)

## 📁 Folder Structure

```
docs/
├── docker/              # Docker deployment docs
├── dev/                 # Development docs & session logs
├── setup-and-backup/    # Setup guides
├── email-setup.md       # Email configuration
├── testing-guide.md     # Testing guide
└── README.md           # This file
```

## 🔍 Finding Information

**Need to setup Docker?** → `docs/docker/`  
**Need to understand a feature?** → `docs/dev/FEATURE-*.md`  
**Need to fix a bug?** → `docs/dev/FIX-*.md`  
**Need session history?** → `docs/dev/SESSION-*.md`  
**Need API docs?** → `docs/api-spec.md`

## 📝 Documentation Guidelines

- Feature docs: `docs/dev/FEATURE-{name}.md`
- Session logs: `docs/dev/SESSION-{date}-{topic}.md`
- Bug fixes: `docs/dev/FIX-{issue}.md`
- Keep root clean - move completed docs to `docs/dev/`
