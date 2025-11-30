# SPEC-5: Testing & Quality Assurance

## 📋 Overview
Establish comprehensive testing strategy for E-Office with automated tests and CI/CD integration.

**Priority**: MEDIUM  
**Estimated Time**: 1 week  
**Impact**: Reduce bugs by 70%, faster development cycles

---

## 🎯 Goals
- Achieve 80% code coverage
- Implement unit, integration, and E2E tests
- Setup CI/CD pipeline
- Establish testing best practices

---

## 📝 Task Breakdown

### Task 5.1: Backend Unit Tests Setup (1 day)

**Framework**: Jest + @types/jest

**Setup**:
```json
// backend/package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",
    "ts-jest": "^29.1.0"
  }
}
```

**Jest Config** (`backend/jest.config.js`):
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

**Example Test**:
```typescript
// tests/services/cache.service.test.ts
import { cacheService } from '../../src/services/cache.service';
import { redis } from '../../src/config/redis';

jest.mock('../../src/config/redis');

describe('CacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('set', () => {
    it('should set value with default TTL', async () => {
      await cacheService.set('test:key', { foo: 'bar' });
      
      expect(redis.setex).toHaveBeenCalledWith(
        'test:key',
        3600,
        JSON.stringify({ foo: 'bar' })
      );
    });
    
    it('should set value with custom TTL', async () => {
      await cacheService.set('test:key', 'value', { ttl: 7200 });
      
      expect(redis.setex).toHaveBeenCalledWith(
        'test:key',
        7200,
        JSON.stringify('value')
      );
    });
  });
  
  describe('get', () => {
    it('should return parsed value', async () => {
      (redis.get as jest.Mock).mockResolvedValue('{"foo":"bar"}');
      
      const result = await cacheService.get('test:key');
      
      expect(result).toEqual({ foo: 'bar' });
    });
    
    it('should return null if not found', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      
      const result = await cacheService.get('test:key');
      
      expect(result).toBeNull();
    });
  });
});
```

**Coverage Target**: 80% for all services

---

### Task 5.2: Integration Tests (2 days)

**Framework**: Supertest + Test Database

**Setup Test Database**:
```typescript
// tests/setup.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL
    }
  }
});

export async function setupTestDB() {
  // Run migrations
  await prisma.$executeRaw`DROP SCHEMA public CASCADE`;
  await prisma.$executeRaw`CREATE SCHEMA public`;
  // Run seed data
}

export async function teardownTestDB() {
  await prisma.$disconnect();
}
```

**Example Integration Test**:
```typescript
// tests/integration/documents.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { setupTestDB, teardownTestDB } from '../setup';

describe('Documents API', () => {
  let authToken: string;
  let tenantId: number;
  
  beforeAll(async () => {
    await setupTestDB();
    // Login and get token
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@test.com', password: 'Test123!' });
    authToken = res.body.token;
    tenantId = res.body.user.tenant_id;
  });
  
  afterAll(async () => {
    await teardownTestDB();
  });
  
  describe('POST /api/v1/documents', () => {
    it('should create document successfully', async () => {
      const res = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fileName: 'test.pdf',
          base64: 'base64data...',
          title: 'Test Document',
          documentTypeId: 1
        });
      
      expect(res.status).toBe(201);
      expect(res.body.document).toHaveProperty('id');
      expect(res.body.document.title).toBe('Test Document');
    });
    
    it('should enforce RBAC permissions', async () => {
      // Create user without document.create permission
      // Attempt to create document
      // Expect 403
    });
  });
});
```

---

### Task 5.3: Frontend E2E Tests (2 days)

**Framework**: Playwright (already setup)

**Expand Coverage**:
```typescript
// frontend/tests/e2e/auth-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('user can register and login', async ({ page }) => {
    // Register
    await page.goto('/register');
    await page.fill('[name="email"]', 'newuser@test.com');
    await page.fill('[name="password"]', 'Test123!');
    await page.fill('[name="confirmPassword"]', 'Test123!');
    await page.fill('[name="full_name"]', 'Test User');
    await page.fill('[name="tenant_domain"]', 'acme');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Đăng ký thành công')).toBeVisible();
    
    // Login (skip email verification for test)
    await page.goto('/login');
    await page.fill('[name="email"]', 'newuser@test.com');
    await page.fill('[name="password"]', 'Test123!');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
  });
  
  test('user can reset password', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.fill('[name="email"]', 'test@test.com');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=check your email')).toBeVisible();
  });
});

// frontend/tests/e2e/document-workflow.spec.ts
test.describe('Document Workflow', () => {
  test('user can create and submit document for approval', async ({ page }) => {
    // Login
    // Navigate to documents
    // Create document
    // Submit for approval
    // Verify approval created
  });
  
  test('approver can approve document', async ({ page, context }) => {
    // Login as approver
    // Navigate to my approvals
    // Approve document
    // Verify status updated
  });
});
```

**Run Tests**:
```bash
cd frontend
npm run test:e2e
npm run test:e2e:headed  # With UI
```

---

### Task 5.4: CI/CD Pipeline Setup (1 day)

**File**: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: eoffice_test
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      
      - name: Install dependencies
        working-directory: ./backend
        run: npm ci
      
      - name: Run Prisma migrations
        working-directory: ./backend
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/eoffice_test
        run: |
          npx prisma migrate deploy
          npx prisma generate
      
      - name: Run tests
        working-directory: ./backend
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/eoffice_test
          REDIS_URL: redis://localhost:6379
        run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          directory: ./backend/coverage

  frontend-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci
      
      - name: Install Playwright
        working-directory: ./frontend
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        working-directory: ./frontend
        run: npm run test:e2e

  lint:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Lint backend
        working-directory: ./backend
        run: npm run lint
      
      - name: Lint frontend
        working-directory: ./frontend
        run: npm run lint
```

---

### Task 5.5: Performance Testing (1 day)

**Tool**: k6

**Test Script** (`tests/performance/load-test.js`):
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },  // Ramp up to 50 users
    { duration: '3m', target: 50 },  // Stay at 50 users
    { duration: '1m', target: 100 }, // Ramp up to 100 users
    { duration: '3m', target: 100 }, // Stay at 100 users
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],   // Error rate < 1%
  },
};

export default function () {
  // Login
  const loginRes = http.post('http://localhost:4000/api/v1/auth/login', {
    email: 'test@test.com',
    password: 'Test123!',
  });
  
  check(loginRes, {
    'login successful': (r) => r.status === 200,
  });
  
  const token = loginRes.json('token');
  
  // List documents
  const docsRes = http.get('http://localhost:4000/api/v1/documents', {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  check(docsRes, {
    'documents loaded': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

**Run**:
```bash
k6 run tests/performance/load-test.js
```

---

## 📊 Success Metrics

- **Code Coverage**: 80%+ for backend, 70%+ for frontend
- **Test Execution Time**: <5 minutes total
- **CI/CD Pipeline**: <10 minutes
- **Bug Detection**: 70% of bugs caught before production

---

## 🚀 Deployment Checklist

- [ ] Jest configured for backend
- [ ] Playwright tests passing
- [ ] CI/CD pipeline running
- [ ] Code coverage reports enabled
- [ ] Performance baselines established
