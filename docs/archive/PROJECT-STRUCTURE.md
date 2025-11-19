# 🏗️ Cấu trúc dự án WP Sign

## 📁 Tổng quan

```
wp-sign/
├── backend/              # Node.js API Server
├── frontend/             # Next.js UI
├── license-server/       # License activation service
├── docs/                 # Documentation
├── docker-compose.yml    # Docker setup
└── package.json          # Root scripts (run both)
```

---

## 🔧 Backend (Node.js + Express + TypeScript)

```
backend/
├── src/
│   ├── config/                    # Configuration
│   │   ├── env.ts                # Environment variables (Zod validation)
│   │   ├── prisma.ts             # Prisma client
│   │   ├── redis.ts              # Redis client
│   │   └── email.ts              # ✨ Email transporter (nodemailer)
│   │
│   ├── core/                      # Core utilities
│   │   ├── errors/
│   │   │   └── api-error.ts      # Custom error class
│   │   ├── middlewares/
│   │   │   ├── error-handler.ts  # Global error handler
│   │   │   └── validate.ts       # Request validation
│   │   └── utils/
│   │       └── fileStorage.ts    # File upload helper
│   │
│   ├── modules/                   # Business modules (Clean Architecture)
│   │   │
│   │   ├── auth/                 # 🔐 Authentication
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts   # JWT logic
│   │   │   ├── auth.repository.ts
│   │   │   ├── auth.middleware.ts # Protect routes
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.types.ts
│   │   │
│   │   ├── tenants/              # 🏢 Multi-tenant
│   │   │   ├── tenants.controller.ts
│   │   │   ├── tenants.service.ts
│   │   │   ├── tenants.repository.ts
│   │   │   └── tenants.routes.ts
│   │   │
│   │   ├── documents/            # 📄 Document management
│   │   │   ├── documents.controller.ts
│   │   │   ├── documents.service.ts  # Upload, list, delete
│   │   │   ├── documents.repository.ts
│   │   │   └── documents.routes.ts
│   │   │
│   │   ├── signRequests/         # ✍️ Sign request workflow
│   │   │   ├── signRequests.controller.ts
│   │   │   ├── signRequests.service.ts  # Create, cancel
│   │   │   ├── signRequests.repository.ts
│   │   │   └── signRequests.routes.ts
│   │   │
│   │   ├── signers/              # 👤 Signer management
│   │   │   ├── signers.controller.ts
│   │   │   ├── signers.service.ts  # Send OTP, sign document
│   │   │   ├── signers.repository.ts
│   │   │   └── signers.routes.ts
│   │   │
│   │   ├── audit/                # 📊 Audit logging
│   │   │   ├── audit.controller.ts
│   │   │   ├── audit.service.ts  # Record events
│   │   │   └── audit.routes.ts
│   │   │
│   │   ├── webhooks/             # 🔗 Webhook system
│   │   │   ├── webhooks.controller.ts
│   │   │   ├── webhooks.service.ts  # Register, emit events
│   │   │   └── webhooks.routes.ts
│   │   │
│   │   ├── licenses/             # 🔑 License validation
│   │   │   ├── license.guard.ts  # Check license
│   │   │   └── license.service.ts
│   │   │
│   │   └── common/               # ✨ Shared services
│   │       └── email.service.ts  # 📧 Email templates & sending
│   │
│   ├── router/
│   │   └── v1.ts                 # API routes aggregation
│   │
│   ├── types/
│   │   └── express.d.ts          # TypeScript declarations
│   │
│   ├── app.ts                    # Express app setup
│   └── server.ts                 # Server entry point
│
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── seed.ts                   # Seed data script
│
├── scripts/
│   ├── seed.js                   # Seed runner
│   └── test-basic-flow.ts        # ✨ Automated test script
│
├── storage/                      # Uploaded files
│   └── {tenantId}/
│       └── documents/
│
├── .env                          # ✨ Environment variables (created)
├── .env.example                  # ✨ Environment template
├── Dockerfile                    # Docker image
├── package.json                  # Dependencies
└── tsconfig.json                 # TypeScript config
```

---

## 🎨 Frontend (Next.js 14 + TailwindCSS)

```
frontend/
├── app/
│   ├── (auth)/                   # Auth layout group
│   │   └── login/
│   │       └── page.tsx          # Login page
│   │
│   ├── (dashboard)/              # Dashboard layout group
│   │   ├── layout.tsx            # Dashboard layout (sidebar)
│   │   ├── page.tsx              # Dashboard home
│   │   │
│   │   ├── documents/            # 📄 Document pages
│   │   │   ├── page.tsx          # List documents
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx      # Document detail
│   │   │   └── upload/
│   │   │       └── page.tsx      # Upload document
│   │   │
│   │   ├── sign-requests/        # ✍️ Sign request pages
│   │   │   ├── page.tsx          # List sign requests
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx      # Sign request detail
│   │   │   └── create/
│   │   │       └── page.tsx      # Create sign request
│   │   │
│   │   ├── audit/                # 📊 Audit logs
│   │   │   └── page.tsx          # Audit timeline
│   │   │
│   │   ├── webhooks/             # 🔗 Webhook config
│   │   │   └── page.tsx          # Webhook management
│   │   │
│   │   └── settings/             # ⚙️ Settings
│   │       └── page.tsx          # User settings
│   │
│   ├── globals.css               # Global styles
│   └── layout.tsx                # Root layout
│
├── components/                   # React components
│   ├── ui/                       # UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── ...
│   ├── DocumentCard.tsx
│   ├── SignRequestCard.tsx
│   └── ...
│
├── lib/                          # Utilities
│   ├── api.ts                    # API client (fetch wrapper)
│   ├── auth.ts                   # Auth helpers
│   └── utils.ts                  # Utility functions
│
├── contexts/                     # React contexts
│   └── AuthContext.tsx           # Auth state management
│
├── tests/                        # ✨ E2E tests
│   └── e2e.spec.ts               # Playwright tests
│
├── .env.local                    # Environment variables
├── next.config.js                # Next.js config
├── tailwind.config.js            # TailwindCSS config
├── package.json                  # Dependencies
└── tsconfig.json                 # TypeScript config
```

---

## 🔑 License Server (On-Premise)

```
license-server/
├── src/
│   ├── routes/
│   │   ├── activate.ts           # License activation
│   │   └── validate.ts           # License validation
│   ├── middleware/
│   │   └── auth.ts               # API key auth
│   └── server.ts                 # Server entry point
│
├── keys/
│   ├── private.pem               # RSA private key
│   └── public.pem                # RSA public key
│
├── Dockerfile
├── package.json
└── tsconfig.json
```

---

## 📚 Documentation

```
docs/
├── blueprint_e_signature_saas.md  # System design
├── api-spec.md                    # API specification
├── db-schema.sql                  # Database schema
├── roadmap.md                     # Development roadmap
├── email-setup.md                 # ✨ Email configuration guide
└── testing-guide.md               # ✨ Testing guide
```

---

## 📝 Root Files (Guides)

```
root/
├── README.md                      # ✨ Main documentation
├── START.md                       # ✨ Quick start (30s)
├── RUN-BOTH.md                    # ✨ Run backend + frontend
├── COMPLETE-SETUP.md              # ✨ Complete setup checklist
├── SETUP-DATABASE.md              # ✨ Database setup guide
├── HOW-TO-RUN.md                  # ✨ How to run guide
├── README-TESTING.md              # ✨ Testing guide
├── TEST-CHECKLIST.md              # ✨ 50+ test cases
├── QUICK-START.md                 # ✨ 5-minute guide
├── START-HERE.md                  # ✨ Welcome guide
├── START-SERVERS.md               # ✨ Server troubleshooting
├── RUN-NOW.md                     # ✨ Quick run guide
├── DONE.md                        # ✨ Completion summary
├── SUMMARY.md                     # ✨ Project summary
├── NEXT-STEPS.md                  # ✨ What's next
├── CHANGELOG.md                   # ✨ Version history
├── TODAY-SUMMARY.md               # ✨ Today's work
├── DOCUMENTATION-INDEX.md         # ✨ All docs index
├── AGENTS.md                      # Progress log
├── test-api.http                  # ✨ REST Client tests
├── docker-compose.yml             # Docker setup
└── package.json                   # ✨ Root scripts
```

---

## 🗄️ Database (PostgreSQL)

```
Database: esign
├── tenants                        # Multi-tenant data
├── users                          # User accounts
├── documents                      # PDF documents
├── sign_requests                  # Signing workflows
├── signers                        # Individual signers
├── audit_logs                     # Activity tracking
└── license                        # On-premise licenses
```

**Relationships:**
```
tenants (1) → (N) users
tenants (1) → (N) documents
tenants (1) → (N) sign_requests
documents (1) → (N) sign_requests
sign_requests (1) → (N) signers
documents (1) → (N) audit_logs
```

---

## 🐳 Docker Services

```
docker-compose.yml
├── db (PostgreSQL)                # Port 5432
├── redis (Redis)                  # Port 6379
├── backend (Optional)             # Port 4000
├── frontend (Optional)            # Port 3000
└── license-server (Optional)      # Port 5000
```

**Note:** Backend, frontend, license-server thường chạy locally với `npm run dev`

---

## 🔄 Data Flow

### 1. Upload Document
```
Frontend → Backend API → Prisma → PostgreSQL
                      ↓
                  File Storage (./storage/)
                      ↓
                  Audit Log
```

### 2. Create Sign Request
```
Frontend → Backend API → Prisma → PostgreSQL
                      ↓
                  Create Signers
                      ↓
                  Audit Log + Webhook
```

### 3. Send OTP
```
Frontend → Backend API → Generate OTP
                      ↓
                  Hash & Save to DB
                      ↓
                  Email Service → Console Log (dev)
                                → SMTP (prod)
```

### 4. Sign Document
```
Frontend → Backend API → Verify OTP
                      ↓
                  Update Signer Status
                      ↓
                  Update Sign Request Status
                      ↓
                  Audit Log + Webhook
```

---

## 🎯 Architecture Pattern

### Backend: Clean Architecture

```
Controller (HTTP) → Service (Business Logic) → Repository (Data Access) → Database
                         ↓
                    Email Service
                    Webhook Service
                    Audit Service
```

### Frontend: Component-Based

```
Page → Components → API Client → Backend
         ↓
    React Query (State)
         ↓
    Auth Context
```

---

## 📦 Key Dependencies

### Backend
- **express** - Web framework
- **prisma** - ORM
- **typescript** - Type safety
- **jsonwebtoken** - JWT auth
- **bcryptjs** - Password hashing
- **nodemailer** - ✨ Email sending
- **zod** - Validation
- **ioredis** - Redis client

### Frontend
- **next** - React framework
- **react** - UI library
- **@tanstack/react-query** - State management
- **tailwindcss** - Styling
- **dayjs** - Date formatting

---

## 🔐 Security Layers

1. **JWT Authentication** - Access + Refresh tokens
2. **Multi-tenant Isolation** - Tenant ID in all queries
3. **Password Hashing** - bcrypt
4. **OTP Verification** - 6-digit, 10-minute expiry
5. **CORS Protection** - Configured origins
6. **Helmet** - Security headers
7. **License Validation** - On-premise guard

---

## 📊 Monitoring & Logging

- **Audit Logs** - All actions tracked
- **Console Logs** - Development
- **Email Logs** - Dev mode console
- **Webhook Events** - Event-driven notifications

---

## 🎨 UI Features

- **Modern Design** - Glass cards, gradients
- **Responsive** - Mobile-friendly
- **Dark Mode Ready** - TailwindCSS
- **Drag & Drop** - File upload
- **Real-time Updates** - React Query
- **Toast Notifications** - User feedback

---

## 🚀 Deployment

### Development
```
npm run dev  # Both backend + frontend
```

### Production
```
docker-compose up -d  # Full stack
```

---

## 📈 Scalability

- **Multi-tenant** - Horizontal scaling
- **Stateless API** - Load balancing ready
- **Redis Cache** - Session management
- **File Storage** - Can switch to S3/MinIO
- **Database** - PostgreSQL replication ready

---

## ✨ Recent Additions (2025-11-18)

- ✅ Email service với nodemailer
- ✅ 3 email templates (Vietnamese)
- ✅ Automated test script
- ✅ REST Client test file
- ✅ 15+ documentation files
- ✅ Root package.json với concurrently
- ✅ Complete setup guides

---

## 🎯 Summary

**Total Files:** 100+ files
**Backend Modules:** 9 modules
**Frontend Pages:** 10+ pages
**Documentation:** 20+ files
**Test Cases:** 50+ scenarios
**Email Templates:** 3 templates
**API Endpoints:** 20+ endpoints

---

**Architecture:** Clean, Modular, Scalable
**Tech Stack:** Modern, Production-ready
**Documentation:** Comprehensive
**Testing:** Automated + Manual

🎉 **Production Ready!**
