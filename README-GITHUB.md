# WP Sign - E-Signature Platform

Enterprise-grade electronic signature solution with multi-tenant support, RBAC, and comprehensive audit trails.

## 🚀 Features

### Core Features
- ✅ **Multi-tenant Architecture** - Isolated data per organization
- ✅ **Document Management** - Upload, version control, secure storage
- ✅ **E-Signature Workflows** - Sequential/parallel signing, OTP verification
- ✅ **Email Integration** - OTP delivery, notifications (Gmail, Outlook, SendGrid, AWS SES, Mailgun)
- ✅ **RBAC System** - Role-based access control with granular permissions
- ✅ **Department Management** - Hierarchical organization structure
- ✅ **User Management** - Full user lifecycle with role assignment
- ✅ **License Management** - Offline license validation with JWT
- ✅ **Webhook Support** - Real-time event notifications
- ✅ **Audit Logs** - Complete activity tracking

### Tech Stack
- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Frontend**: Next.js 14 (App Router), React, TailwindCSS
- **Database**: PostgreSQL
- **Cache**: Redis
- **Email**: Nodemailer with SMTP
- **License**: JWT-based offline validation

## 📁 Project Structure

```
e-office/
├── backend/              # Express API server
│   ├── src/
│   │   ├── modules/      # Feature modules
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── departments/
│   │   │   ├── roles/
│   │   │   ├── documents/
│   │   │   ├── signRequests/
│   │   │   └── ...
│   │   ├── middleware/   # Auth, permissions
│   │   └── config/       # Email, database
│   ├── prisma/           # Database schema & migrations
│   └── scripts/          # Seed & test scripts
├── frontend/             # Next.js dashboard
│   └── app/
│       └── (dashboard)/  # Protected routes
│           ├── users/
│           ├── departments/
│           ├── roles/
│           ├── documents/
│           └── sign-requests/
├── license-server/       # License validation service
└── docker-compose.yml    # Dev environment
```

## 🛠️ Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- npm or yarn

### Quick Start

1. **Clone repository**
```bash
git clone <your-repo-url>
cd e-office
```

2. **Setup Backend**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npx prisma generate
npx prisma db push
node scripts/seed.js
node scripts/seed-rbac.js
```

3. **Setup Frontend**
```bash
cd frontend
npm install
cp .env.example .env.local
# Edit NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

4. **Setup License Server**
```bash
cd license-server
npm install
cp .env.example .env
```

5. **Start Services**

Using Docker (recommended):
```bash
docker-compose up -d postgres redis
```

Or manually start PostgreSQL & Redis, then:
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev

# Terminal 3 - License Server
cd license-server && npm run dev
```

6. **Access Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- License Server: http://localhost:5000

**Default Login:**
- Email: `admin@example.com`
- Password: `admin123`

## 📧 Email Configuration

Edit `backend/.env`:

```env
# Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Or use other providers (Outlook, SendGrid, AWS SES, Mailgun)
# See docs/email-setup.md for details
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# E2E tests (requires running servers)
cd frontend
npm run test:e2e

# API testing with REST Client
# Open test-api.http in VS Code with REST Client extension
```

## 📚 Documentation

- [Quick Start Guide](QUICK-START.md)
- [Testing Guide](docs/testing-guide.md)
- [Email Setup](docs/email-setup.md)
- [API Documentation](test-api.http)
- [Development Log](AGENTS.md)

## 🔐 Security Notes

**IMPORTANT**: Never commit these files:
- `.env` files (contains secrets)
- `uploads/` folder (user documents)
- Database credentials
- SMTP passwords
- License keys

All sensitive files are already in `.gitignore`.

## 🏗️ Architecture

### RBAC System
- **4 Default Roles**: Admin, Manager, User, Viewer
- **27 Permissions** across 7 resources
- **Granular Control**: resource:action format (e.g., `documents:create`)

### Multi-tenant Isolation
- Tenant-scoped data access
- Separate license limits per tenant
- Isolated document storage

### Signing Workflow
1. Upload document
2. Create sign request with signers
3. Send OTP to signers
4. Signers verify OTP and sign
5. Document marked as completed
6. Webhook notifications sent

## 🚀 Deployment

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

[Your Contributing Guidelines]

## 📞 Support

[Your Support Information]

---

**Built with ❤️ for secure document signing**
