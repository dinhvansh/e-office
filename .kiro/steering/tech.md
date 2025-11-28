# Tech Stack & Build System

## Architecture

**Monorepo Structure**: Backend (Express API) + Frontend (Next.js) + License Server

## Backend

**Runtime & Framework**
- Node.js 20+ with TypeScript 5.4
- Express.js with modular architecture
- ts-node-dev for development hot reload

**Database & ORM**
- PostgreSQL 14+ (primary database)
- Prisma ORM (schema-first approach)
- Redis for caching and rate limiting

**Key Libraries**
- `jsonwebtoken` + `bcrypt` - Authentication
- `zod` - Runtime validation
- `nodemailer` - Email notifications
- `pdf-lib` - PDF manipulation
- `helmet` + `express-rate-limit` - Security
- `morgan` - HTTP logging

**Common Commands**
```bash
# Development
npm run dev                    # Start with hot reload
npm run build                  # Compile TypeScript
npm start                      # Run production build

# Database
npx prisma generate            # Generate Prisma client
npx prisma db push             # Push schema to database
npx prisma migrate dev         # Create migration
npx prisma studio              # Open database GUI

# Seeding
node scripts/seed.js           # Base data
node scripts/seed-rbac.js      # Roles & permissions
node scripts/seed-document-types.js
node scripts/seed-workflows-simple.js
```

## Frontend

**Framework**
- Next.js 14 (App Router, React Server Components)
- React 18 with TypeScript
- TailwindCSS 3.4 for styling

**UI Components**
- shadcn/ui (Radix UI primitives)
- `@radix-ui/react-*` - Dialog, Dropdown, Select, Switch, Tabs
- `lucide-react` - Icons
- `sonner` - Toast notifications

**State & Data**
- React Query (@tanstack/react-query) - Server state
- Context API - Auth state
- Local state with useState/useReducer

**PDF Handling**
- `pdfjs-dist` - PDF rendering
- `react-pdf` - React wrapper
- `signature_pad` - Signature capture

**Common Commands**
```bash
# Development
npm run dev                    # Start dev server (port 3000)
npm run build                  # Production build
npm start                      # Start production server

# Testing
npm run test:e2e               # Playwright E2E tests
```

## Development Workflow

**Starting the Application**
```bash
# From root directory
npm run dev                    # Start both backend + frontend

# Or individually
npm run dev:backend            # Backend only (port 4000)
npm run dev:frontend           # Frontend only (port 3000)

# Or use PowerShell script
./scripts/start-all.ps1        # Windows
```

**First Time Setup**
```bash
# Install all dependencies
npm run install:all

# Setup backend
cd backend
cp .env.example .env
npx prisma generate
npx prisma db push
node scripts/seed.js
node scripts/seed-rbac.js
node scripts/seed-document-types.js
node scripts/seed-workflows-simple.js

# Setup frontend
cd ../frontend
cp .env.example .env.local
```

**After Git Pull**
```bash
# Update dependencies
cd backend && npm install
cd ../frontend && npm install

# Update database schema
cd ../backend
npx prisma generate
npx prisma db push
```

## Environment Variables

**Backend** (`.env`)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `REDIS_URL` - Redis connection (optional)
- `SMTP_*` - Email configuration
- `CORS_ORIGIN` - Allowed origins (comma-separated)

**Frontend** (`.env.local`)
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:4000)

## Testing

**Backend Testing**
- Script-based testing in `backend/scripts/`
- Naming: `test-*.js`, `check-*.js`, `debug-*.js`
- Run with: `node scripts/test-<feature>.js`

**Frontend Testing**
- Playwright for E2E tests
- Tests in `frontend/tests/`
- Run with: `npm run test:e2e`

**API Testing**
- REST Client extension in VS Code
- Test files: `tests/http/*.http`

## Code Quality

**TypeScript Configuration**
- Strict mode enabled
- ES2020 target (backend), ES5 target (frontend)
- Path aliases: `@/*` maps to frontend root

**Linting & Formatting**
- ESLint configured (backend)
- Prettier for code formatting
- Run: `npm run lint`

## Docker Support

**Development Environment**
```bash
docker-compose up              # Start all services
docker-compose down            # Stop all services
```

Services: PostgreSQL, Redis, Backend, Frontend, License Server
