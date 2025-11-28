# Project Structure & Organization

## Repository Layout

```
e-office/
├── backend/              # Express API server
├── frontend/             # Next.js dashboard
├── license-server/       # License validation service
├── docs/                 # Documentation
├── scripts/              # Root-level scripts
├── storage/              # File storage (gitignored)
└── docker-compose.yml    # Development environment
```

## Backend Structure

```
backend/
├── src/
│   ├── modules/          # Feature modules (domain-driven)
│   │   ├── auth/         # Authentication
│   │   ├── users/        # User management
│   │   ├── documents/    # Document CRUD + permissions
│   │   ├── documentTypes/
│   │   ├── departments/
│   │   ├── roles/
│   │   ├── workflows/    # Workflow templates
│   │   ├── approvals/    # Approval flow
│   │   ├── signRequests/ # Signing requests
│   │   ├── documentFlow/ # Unified document flow
│   │   ├── positions/    # Job positions
│   │   ├── numbering/    # Auto-numbering
│   │   ├── external-orgs/
│   │   ├── public/       # Public signing pages
│   │   └── common/       # Shared services (email, etc.)
│   ├── middleware/       # Express middleware
│   │   ├── auth.ts       # JWT authentication
│   │   └── permissions.ts # RBAC checks
│   ├── core/             # Core utilities
│   │   └── middlewares/  # Error handling, context
│   ├── router/           # Route aggregation
│   │   └── v1.ts         # API v1 routes
│   ├── config/           # Configuration
│   │   └── env.ts        # Environment variables
│   ├── types/            # TypeScript types
│   ├── utils/            # Utility functions
│   │   └── errors.ts     # Custom error classes
│   ├── app.ts            # Express app setup
│   └── server.ts         # Server entry point
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── migrations/       # Database migrations
├── scripts/              # Utility scripts (200+ files)
│   ├── seed*.js          # Data seeding
│   ├── test-*.js         # Feature testing
│   ├── check-*.js        # Data inspection
│   ├── debug-*.js        # Debugging helpers
│   └── fix-*.js          # Data fixes
├── storage/              # Uploaded files (by tenant)
│   └── {tenant_id}/
└── backups/              # Database backups
```

### Module Pattern

Each module follows this structure:
```
modules/{feature}/
├── {feature}.routes.ts      # Express routes
├── {feature}.controller.ts  # Request handlers
├── {feature}.service.ts     # Business logic
├── {feature}.repository.ts  # Database queries
├── {feature}.dto.ts         # Data transfer objects
├── {feature}.access.ts      # Permission checks (optional)
└── {feature}.types.ts       # TypeScript types (optional)
```

**Key Principles**:
- Routes define endpoints and call controllers
- Controllers handle HTTP, validate input, call services
- Services contain business logic, orchestrate repositories
- Repositories handle database operations (Prisma)
- DTOs use Zod for validation
- Access files check permissions using RBAC

## Frontend Structure

```
frontend/
├── app/
│   ├── (dashboard)/      # Protected routes (layout wrapper)
│   │   ├── page.tsx      # Dashboard home
│   │   ├── layout.tsx    # Sidebar + header layout
│   │   ├── documents/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # Document detail
│   │   │       └── flow/page.tsx   # Document flow timeline
│   │   ├── document-types/
│   │   ├── workflows/
│   │   ├── approvals/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── sign-requests/
│   │   │   ├── page.tsx
│   │   │   ├── create/page.tsx
│   │   │   └── [id]/
│   │   │       ├── editor/page.tsx      # Field placement
│   │   │       ├── internal-sign/page.tsx
│   │   │       └── sign/page.tsx
│   │   ├── my-tasks/     # Combined approvals + signing
│   │   ├── users/
│   │   ├── departments/
│   │   ├── roles/
│   │   ├── positions/
│   │   └── external-orgs/
│   ├── login/
│   │   └── page.tsx
│   └── sign/
│       └── [token]/page.tsx  # Public signing page
├── components/
│   ├── ui/               # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── select.tsx
│   │   ├── page-header.tsx
│   │   ├── filter-tabs.tsx
│   │   ├── metric-card.tsx
│   │   ├── status-tag.tsx
│   │   ├── empty-state.tsx
│   │   └── ...
│   ├── documents/        # Document-specific components
│   ├── workflow/         # Workflow builder components
│   ├── flow/             # Document flow components
│   ├── pdf/              # PDF viewer components
│   ├── signing/          # Signing components
│   ├── sign-requests/    # Sign request components
│   └── providers/        # Context providers
│       └── auth-provider.tsx
├── hooks/                # Custom React hooks
├── lib/                  # Utilities
│   ├── api.ts            # API client
│   └── utils.ts          # Helper functions
├── constants/
│   └── sidebarItems.ts   # Navigation config
└── public/               # Static assets
```

### Frontend Patterns

**Page Structure**:
- Use Server Components by default
- Client Components marked with `'use client'`
- Data fetching in Server Components or React Query
- Forms use controlled components with local state

**Component Organization**:
- `ui/` - Reusable UI primitives (shadcn/ui)
- `{feature}/` - Feature-specific components
- `providers/` - Context providers
- Keep components focused and composable

**Routing**:
- App Router with file-based routing
- `(dashboard)` - Route group with shared layout
- `[id]` - Dynamic route segments
- `page.tsx` - Route component
- `layout.tsx` - Shared layout

## Documentation Structure

```
docs/
├── dev/                  # Development documentation
│   ├── DEVELOPMENT-RULES.md      # ⭐ Mandatory rules
│   ├── LESSONS-LEARNED.md        # ⭐ Bug fixes & learnings
│   ├── INDEX.md                  # Documentation index
│   ├── ERROR-HANDLING-GUIDE.md
│   ├── UI-TESTING-GUIDE.md
│   ├── WORKFLOW-MODES-QUICK-REF.md
│   ├── NUMBERING-RULES-EXPLAINED.md
│   ├── FEATURE-*.md              # Feature specifications
│   ├── SESSION-*.md              # Development session logs
│   ├── PHASE-*-*.md              # Phase reports
│   └── ...
├── archive/              # Deprecated/old docs
├── setup/                # Setup guides
└── api-spec.md           # API documentation
```

**Documentation Rules**:
- Always update `LESSONS-LEARNED.md` after fixing bugs
- Create `FEATURE-*.md` for new features
- Session logs: `SESSION-YYYY-MM-DD-*.md`
- Move outdated docs to `archive/`

## Scripts Organization

**Backend Scripts** (`backend/scripts/`):
- `seed-*.js` - Database seeding
- `test-*.js` - Feature testing
- `check-*.js` - Data inspection
- `debug-*.js` - Debugging helpers
- `fix-*.js` - Data fixes
- `assign-*.js` - Permission assignment
- `create-*.js` - Test data creation

**Root Scripts** (`scripts/`):
- `start-all.ps1` - Start all services
- `stop-all.ps1` - Stop all services
- `setup-final.ps1` - Complete setup

## Naming Conventions

**Files**:
- Backend: `kebab-case.ts` (e.g., `sign-requests.service.ts`)
- Frontend: `PascalCase.tsx` for components, `kebab-case.ts` for utilities
- Scripts: `kebab-case.js` with prefix (e.g., `test-approval-flow.js`)

**Database**:
- Tables: `snake_case` plural (e.g., `sign_requests`)
- Columns: `snake_case` (e.g., `created_at`)
- Relations: descriptive names (e.g., `user_department`)

**Code**:
- Variables/functions: `camelCase`
- Classes/Components: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Types/Interfaces: `PascalCase`

## Key Directories to Know

**When working on features**:
- Backend logic: `backend/src/modules/{feature}/`
- Frontend pages: `frontend/app/(dashboard)/{feature}/`
- Frontend components: `frontend/components/{feature}/`
- Database schema: `backend/prisma/schema.prisma`

**When testing**:
- Backend scripts: `backend/scripts/test-*.js`
- Frontend E2E: `frontend/tests/*.spec.ts`
- API tests: `tests/http/*.http`

**When documenting**:
- Feature specs: `docs/dev/FEATURE-*.md`
- Bug fixes: `docs/dev/LESSONS-LEARNED.md`
- Session logs: `docs/dev/SESSION-*.md`

**When debugging**:
- Backend logs: Console output from `npm run dev:backend`
- Frontend logs: Browser console + Next.js terminal
- Database: `npx prisma studio` or check scripts in `backend/scripts/check-*.js`
